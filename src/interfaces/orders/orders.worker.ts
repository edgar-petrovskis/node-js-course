import type { ConsumeMessage } from 'amqplib';
import type { ConfirmChannel } from 'amqplib';

import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { OrderProcessingResult } from '../../application/orders/contracts/order-processing-result.contract';
import { OrdersProcessingService } from '../../application/orders/orders-processing.service';
import { RABBIT_CHANNEL } from '../../infrastructure/rabbit/rabbit.tokens';

type OrderProcessMessage = {
  messageId: string;
  orderId: string;
  createdAt: string;
  attempt: number;
};

@Injectable()
export class OrdersWorker implements OnModuleInit {
  private readonly logger = new Logger(OrdersWorker.name);
  private readonly maxAttempts = 3;
  private exchange!: string;
  private queueProcess!: string;
  private queueDlq!: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly ordersProcessingService: OrdersProcessingService,
    @Inject(RABBIT_CHANNEL)
    private readonly channel: ConfirmChannel,
  ) {}

  async onModuleInit(): Promise<void> {
    this.exchange = this.configService.getOrThrow<string>('rabbitmq.exchange');
    this.queueProcess = this.configService.getOrThrow<string>(
      'rabbitmq.queueProcess',
    );
    this.queueDlq = this.configService.getOrThrow<string>('rabbitmq.queueDlq');

    await this.channel.prefetch(1);
    await this.channel.consume(
      this.queueProcess,
      (message: ConsumeMessage | null) => {
        void this.handleMessage(message);
      },
    );
  }

  private async handleMessage(message: ConsumeMessage | null): Promise<void> {
    if (!message) {
      return;
    }

    const parsed = this.parseMessage(message);
    if (!parsed) {
      this.channel.ack(message);
      return;
    }

    try {
      const result = await this.ordersProcessingService.processPendingOrder(
        parsed.messageId,
        parsed.orderId,
      );
      const resultTag: OrderProcessingResult = result;

      this.logger.log(
        `messageId=${parsed.messageId} orderId=${parsed.orderId} attempt=${parsed.attempt} result=${resultTag}`,
      );
      this.channel.ack(message);
    } catch (error) {
      await this.handleTechnicalError(parsed, message, error);
    }
  }

  private async handleTechnicalError(
    parsed: OrderProcessMessage,
    message: ConsumeMessage,
    error: unknown,
  ): Promise<void> {
    const errorReason =
      error instanceof Error ? error.message : 'unknown_error';

    if (parsed.attempt < this.maxAttempts - 1) {
      const retriedMessage: OrderProcessMessage = {
        ...parsed,
        attempt: parsed.attempt + 1,
      };

      this.publish(this.queueProcess, retriedMessage);
      await this.channel.waitForConfirms();
      this.channel.ack(message);
      this.logger.warn(
        `messageId=${parsed.messageId} orderId=${parsed.orderId} attempt=${parsed.attempt} result=retry error=${errorReason}`,
      );

      return;
    }

    this.publish(this.queueDlq, parsed);
    await this.channel.waitForConfirms();
    this.channel.ack(message);
    this.logger.error(
      `messageId=${parsed.messageId} orderId=${parsed.orderId} attempt=${parsed.attempt} result=dlq error=${errorReason}`,
    );
  }

  private publish(routingKey: string, payload: OrderProcessMessage): void {
    this.channel.publish(
      this.exchange,
      routingKey,
      Buffer.from(JSON.stringify(payload)),
      {
        contentType: 'application/json',
        contentEncoding: 'utf-8',
        persistent: true,
        messageId: payload.messageId,
      },
    );
  }

  private parseMessage(message: ConsumeMessage): OrderProcessMessage | null {
    try {
      const payload = JSON.parse(
        message.content.toString(),
      ) as Partial<OrderProcessMessage>;
      if (
        !payload.messageId ||
        !payload.orderId ||
        typeof payload.attempt !== 'number'
      ) {
        return null;
      }

      return {
        messageId: payload.messageId,
        orderId: payload.orderId,
        createdAt: payload.createdAt ?? new Date().toISOString(),
        attempt: payload.attempt,
      };
    } catch {
      return null;
    }
  }
}
