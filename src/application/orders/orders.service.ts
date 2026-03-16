import { DataSource, QueryFailedError } from 'typeorm';

import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

import { OrderStatus } from '../../domain/orders/order-status';
import { OrderItem } from '../../infrastructure/entities/order-item.entity';
import { Order } from '../../infrastructure/entities/order.entity';
import { Product } from '../../infrastructure/entities/product.entity';
import { OrdersPublisher } from '../../infrastructure/rabbit/orders.publisher';

type OrderItemInput = {
  productId: string;
  quantity: number;
};

type CreateOrderResult = {
  order: Order;
  isDuplicate: boolean;
};

const ORDER_IDEMPOTENCY_CONSTRAINT = 'UQ_orders_user_id_idempotency_key';
const PG_UNIQUE_VIOLATION_CODE = '23505';

@Injectable()
export class OrdersService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly ordersPublisher: OrdersPublisher,
  ) {}

  async createPendingOrder(
    userId: string,
    idempotencyKey: string,
    items: OrderItemInput[],
  ): Promise<CreateOrderResult> {
    const normalizedItems = this.normalizeItems(items);
    const existingOrder = await this.findOrderByIdempotencyKey(
      userId,
      idempotencyKey,
    );

    if (existingOrder) {
      return { order: existingOrder, isDuplicate: true };
    }

    try {
      const createdOrder = await this.createPendingOrderInTransaction(
        userId,
        idempotencyKey,
        normalizedItems,
      );

      await this.ordersPublisher.publishOrderProcessing(createdOrder.id);

      return { order: createdOrder, isDuplicate: false };
    } catch (error) {
      if (this.isDuplicateIdempotencyError(error)) {
        const duplicateOrder = await this.findOrderByIdempotencyKey(
          userId,
          idempotencyKey,
        );
        if (duplicateOrder) {
          return { order: duplicateOrder, isDuplicate: true };
        }

        throw new InternalServerErrorException('Internal server error');
      }

      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException('Internal server error');
    }
  }

  private normalizeItems(items: OrderItemInput[]): OrderItemInput[] {
    const quantityByProductId = new Map<string, number>();

    for (const item of items) {
      const nextQuantity =
        (quantityByProductId.get(item.productId) ?? 0) + item.quantity;
      if (nextQuantity <= 0) {
        throw new BadRequestException(
          `Item quantity for product ${item.productId} must be greater than 0`,
        );
      }
      quantityByProductId.set(item.productId, nextQuantity);
    }

    return Array.from(
      quantityByProductId.entries(),
      ([productId, quantity]) => ({
        productId,
        quantity,
      }),
    );
  }

  private async createPendingOrderInTransaction(
    userId: string,
    idempotencyKey: string,
    items: OrderItemInput[],
  ): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const productRepository = queryRunner.manager.getRepository(Product);
      const orderRepository = queryRunner.manager.getRepository(Order);
      const orderItemRepository = queryRunner.manager.getRepository(OrderItem);
      const productIds = items.map((item) => item.productId);

      const products = await productRepository
        .createQueryBuilder('product')
        .where('product.id IN (:...productIds)', { productIds })
        .getMany();

      const productIdsSet = new Set(products.map((product) => product.id));
      const missingProductIds = productIds.filter(
        (productId) => !productIdsSet.has(productId),
      );

      if (missingProductIds.length > 0) {
        throw new BadRequestException('One or more products are invalid');
      }

      const productById = new Map(
        products.map((product) => [product.id, product]),
      );
      const orderItemsToCreate: Array<{
        productId: string;
        quantity: number;
        priceAtPurchaseCents: number;
        currency: string;
      }> = [];

      for (const item of items) {
        const product = productById.get(item.productId);

        if (!product) {
          throw new BadRequestException('One or more products are invalid');
        }

        orderItemsToCreate.push({
          productId: item.productId,
          quantity: item.quantity,
          priceAtPurchaseCents: product.priceCents,
          currency: product.currency,
        });
      }

      const orderCurrency = products[0]?.currency ?? 'UAH';
      const createdOrder = await orderRepository.save(
        orderRepository.create({
          userId,
          idempotencyKey,
          status: OrderStatus.PENDING,
          totalAmountCents: 0,
          currency: orderCurrency,
        }),
      );

      const orderItemsEntities = orderItemsToCreate.map((item) =>
        orderItemRepository.create({
          orderId: createdOrder.id,
          productId: item.productId,
          quantity: item.quantity,
          priceAtPurchaseCents: item.priceAtPurchaseCents,
          currency: item.currency,
        }),
      );
      await orderItemRepository.save(orderItemsEntities);

      const orderWithItems = await orderRepository.findOne({
        where: { id: createdOrder.id },
        relations: { items: true },
      });
      if (!orderWithItems) {
        throw new InternalServerErrorException('Internal server error');
      }

      await queryRunner.commitTransaction();

      return orderWithItems;
    } catch (error) {
      await queryRunner.rollbackTransaction();

      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async findOrderByIdempotencyKey(
    userId: string,
    idempotencyKey: string,
  ): Promise<Order | null> {
    const ordersRepository = this.dataSource.getRepository(Order);
    return ordersRepository.findOne({
      where: { userId, idempotencyKey },
      relations: { items: true },
    });
  }

  private isDuplicateIdempotencyError(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }

    const pgError = error.driverError as
      | { code?: string; constraint?: string }
      | undefined;

    return (
      pgError?.code === PG_UNIQUE_VIOLATION_CODE &&
      pgError?.constraint === ORDER_IDEMPOTENCY_CONSTRAINT
    );
  }
}
