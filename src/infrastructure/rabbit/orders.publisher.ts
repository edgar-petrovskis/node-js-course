import { randomUUID } from 'node:crypto';

import type { ConfirmChannel } from 'amqplib';

import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OrdersPublisher {
  constructor(
    private readonly configService: ConfigService,
    @Inject('RABBIT_CHANNEL') private readonly channel: ConfirmChannel,
  ) {}

  async publishOrderProcessing(orderId: string): Promise<void> {
    const exchange = this.configService.getOrThrow<string>('rabbitmq.exchange');
    const routingKey = this.configService.getOrThrow<string>(
      'rabbitmq.queueProcess',
    );

    const message = {
      messageId: randomUUID(),
      orderId,
      createdAt: new Date().toISOString(),
      attempt: 0,
    };

    this.channel.publish(
      exchange,
      routingKey,
      Buffer.from(JSON.stringify(message)),
      {
        contentType: 'application/json',
        contentEncoding: 'utf-8',
        persistent: true,
        messageId: message.messageId,
      },
    );
    await this.channel.waitForConfirms();
  }
}
