import { setTimeout as sleep } from 'node:timers/promises';

import { DataSource, QueryFailedError } from 'typeorm';

import { Injectable, InternalServerErrorException } from '@nestjs/common';

import { OrderStatus } from '../../domain/orders/order-status';
import { OrderItem } from '../../infrastructure/entities/order-item.entity';
import { Order } from '../../infrastructure/entities/order.entity';
import { ProcessedMessage } from '../../infrastructure/entities/processed-message.entity';
import { Product } from '../../infrastructure/entities/product.entity';

import { OrderProcessingResult } from './contracts/order-processing-result.contract';

const PROCESSED_MESSAGES_PK = 'PK_processed_messages_message_id';
const PG_UNIQUE_VIOLATION_CODE = '23505';

@Injectable()
export class OrdersProcessingService {
  constructor(private readonly dataSource: DataSource) {}

  async processPendingOrder(
    messageId: string,
    orderId: string,
  ): Promise<OrderProcessingResult> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const processedMessagesRepository =
        queryRunner.manager.getRepository(ProcessedMessage);
      const ordersRepository = queryRunner.manager.getRepository(Order);
      const orderItemsRepository = queryRunner.manager.getRepository(OrderItem);
      const productsRepository = queryRunner.manager.getRepository(Product);

      await processedMessagesRepository.insert({ messageId, orderId });

      const order = await ordersRepository.findOne({ where: { id: orderId } });
      if (!order) {
        throw new InternalServerErrorException('Order not found');
      }

      await ordersRepository
        .createQueryBuilder()
        .update(Order)
        .set({ status: OrderStatus.PROCESSING })
        .where('id = :orderId', { orderId })
        .execute();

      const orderItems = await orderItemsRepository.find({
        where: { orderId },
      });
      if (orderItems.length === 0) {
        await ordersRepository
          .createQueryBuilder()
          .update(Order)
          .set({ status: OrderStatus.FAILED, processedAt: new Date() })
          .where('id = :orderId', { orderId })
          .execute();
        await queryRunner.commitTransaction();

        return 'failed';
      }

      const productIds = Array.from(
        new Set(orderItems.map((item) => item.productId)),
      );
      const products = await productsRepository
        .createQueryBuilder('product')
        .where('product.id IN (:...productIds)', { productIds })
        .setLock('for_no_key_update')
        .getMany();

      const productById = new Map(
        products.map((product) => [product.id, product]),
      );
      const missingProduct = productIds.some(
        (productId) => !productById.has(productId),
      );
      const hasStockIssue = orderItems.some((item) => {
        const product = productById.get(item.productId);
        return !product || product.stock < item.quantity;
      });
      const hasCurrencyMismatch =
        new Set(products.map((product) => product.currency)).size > 1;

      if (missingProduct || hasStockIssue || hasCurrencyMismatch) {
        await ordersRepository
          .createQueryBuilder()
          .update(Order)
          .set({ status: OrderStatus.FAILED, processedAt: new Date() })
          .where('id = :orderId', { orderId })
          .execute();
        await queryRunner.commitTransaction();

        return 'failed';
      }

      let totalAmountCents = 0;
      const nextProductsState: Product[] = [];
      for (const item of orderItems) {
        const product = productById.get(item.productId);
        if (!product) {
          throw new InternalServerErrorException('Product not found');
        }

        totalAmountCents += item.priceAtPurchaseCents * item.quantity;
        nextProductsState.push({
          ...product,
          stock: product.stock - item.quantity,
        });
      }

      // Temporary test hook for retry/DLQ verification.
      // Uncomment to force a technical failure for messages with quantity === 13.
      // if (orderItems.some((item) => item.quantity === 13)) {
      //   throw new InternalServerErrorException('Simulated technical failure');
      // }

      await this.simulateExternalServiceCall();

      await productsRepository.save(nextProductsState);
      const orderCurrency = products[0]?.currency ?? order.currency;

      await ordersRepository
        .createQueryBuilder()
        .update(Order)
        .set({
          status: OrderStatus.PROCESSED,
          totalAmountCents,
          currency: orderCurrency,
          processedAt: new Date(),
        })
        .where('id = :orderId', { orderId })
        .execute();

      await queryRunner.commitTransaction();

      return 'success';
    } catch (error) {
      await queryRunner.rollbackTransaction();

      if (this.isDuplicateProcessedMessageError(error)) {
        return 'duplicate';
      }

      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async simulateExternalServiceCall(): Promise<void> {
    await sleep(1000);
  }

  private isDuplicateProcessedMessageError(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }

    const pgError = error.driverError as
      | { code?: string; constraint?: string }
      | undefined;

    return (
      pgError?.code === PG_UNIQUE_VIOLATION_CODE &&
      pgError?.constraint === PROCESSED_MESSAGES_PK
    );
  }
}
