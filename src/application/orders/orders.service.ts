import { isISO8601 } from 'class-validator';
import { DataSource, QueryFailedError } from 'typeorm';

import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

import { OrderStatus } from '../../domain/orders/order-status';
import { OrderItem } from '../../infrastructure/entities/order-item.entity';
import { Order } from '../../infrastructure/entities/order.entity';
import { Product } from '../../infrastructure/entities/product.entity';

type OrderItemInput = {
  productId: string;
  quantity: number;
};

type CreateOrderResult = {
  order: Order;
  isDuplicate: boolean;
};

type FindOrdersDateRangeInput = {
  dateFrom?: Date | string;
  dateTo?: Date | string;
};

const ORDER_IDEMPOTENCY_CONSTRAINT = 'UQ_orders_user_id_idempotency_key';
const PG_UNIQUE_VIOLATION_CODE = '23505';

@Injectable()
export class OrdersService {
  constructor(private readonly dataSource: DataSource) {}

  async findOrdersByDateRange(
    input: FindOrdersDateRangeInput,
  ): Promise<Order[]> {
    const { dateFrom, dateTo } = this.normalizeDateRange(input);

    const ordersRepository = this.dataSource.getRepository(Order);
    const query = ordersRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'item')
      .orderBy('order.created_at', 'DESC');

    if (dateFrom) {
      query.andWhere('order.created_at >= :dateFrom', { dateFrom });
    }

    if (dateTo) {
      query.andWhere('order.created_at <= :dateTo', { dateTo });
    }

    return query.getMany();
  }

  async createOrder(
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
      const createdOrder = await this.createOrderInTransaction(
        userId,
        idempotencyKey,
        normalizedItems,
      );

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

  private async createOrderInTransaction(
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

      const lockedProducts = await productRepository
        .createQueryBuilder('product')
        .where('product.id IN (:...productIds)', { productIds })
        .setLock('for_no_key_update')
        .getMany();

      const lockedProductIds = new Set(
        lockedProducts.map((product) => product.id),
      );
      const missingProductIds = productIds.filter(
        (productId) => !lockedProductIds.has(productId),
      );

      if (missingProductIds.length > 0) {
        throw new BadRequestException('One or more products are invalid');
      }

      const productById = new Map(
        lockedProducts.map((product) => [product.id, product]),
      );

      const outOfStockItems = items.filter((item) => {
        const product = productById.get(item.productId);
        return !!product && product.stock < item.quantity;
      });

      if (outOfStockItems.length > 0) {
        throw new ConflictException('Insufficient stock');
      }

      const distinctCurrencies = new Set(
        lockedProducts.map((product) => product.currency),
      );

      if (distinctCurrencies.size > 1) {
        throw new BadRequestException('Invalid order items');
      }

      let totalAmountCents = 0;
      const nextProductsState: Product[] = [];
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

        totalAmountCents += product.priceCents * item.quantity;
        nextProductsState.push({
          ...product,
          stock: product.stock - item.quantity,
        });
        orderItemsToCreate.push({
          productId: item.productId,
          quantity: item.quantity,
          priceAtPurchaseCents: product.priceCents,
          currency: product.currency,
        });
      }

      await productRepository.save(nextProductsState);

      const orderCurrency = lockedProducts[0]?.currency ?? 'UAH';
      const createdOrder = await orderRepository.save(
        orderRepository.create({
          userId,
          idempotencyKey,
          status: OrderStatus.NEW,
          totalAmountCents,
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

  private normalizeDateRange({ dateFrom, dateTo }: FindOrdersDateRangeInput): {
    dateFrom?: Date;
    dateTo?: Date;
  } {
    const parsedDateFrom = this.parseDateInput(dateFrom, 'dateFrom');
    const parsedDateTo = this.parseDateInput(dateTo, 'dateTo');

    if (parsedDateFrom && parsedDateTo && parsedDateFrom > parsedDateTo) {
      throw new BadRequestException(
        'dateFrom must be less than or equal to dateTo',
      );
    }

    return {
      dateFrom: parsedDateFrom,
      dateTo: parsedDateTo,
    };
  }

  private parseDateInput(
    value: Date | string | undefined,
    fieldName: 'dateFrom' | 'dateTo',
  ): Date | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) {
        throw new BadRequestException(
          `${fieldName} must be a valid ISO 8601 date-time`,
        );
      }

      return value;
    }

    if (
      typeof value !== 'string' ||
      !isISO8601(value, { strict: true, strictSeparator: true })
    ) {
      throw new BadRequestException(
        `${fieldName} must be a valid ISO 8601 date-time`,
      );
    }

    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
      throw new BadRequestException(
        `${fieldName} must be a valid ISO 8601 date-time`,
      );
    }

    return parsedDate;
  }
}
