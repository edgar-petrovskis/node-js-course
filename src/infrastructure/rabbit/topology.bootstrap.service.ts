import type { ConfirmChannel } from 'amqplib';

import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RabbitTopologyBootstrapService implements OnModuleInit {
  constructor(
    private readonly configService: ConfigService,
    @Inject('RABBIT_CHANNEL') private readonly channel: ConfirmChannel,
  ) {}

  async onModuleInit(): Promise<void> {
    const exchange = this.configService.getOrThrow<string>('rabbitmq.exchange');
    const processQueue = this.configService.getOrThrow<string>(
      'rabbitmq.queueProcess',
    );
    const dlqQueue = this.configService.getOrThrow<string>('rabbitmq.queueDlq');

    await this.channel.assertExchange(exchange, 'direct', { durable: true });

    await this.channel.assertQueue(processQueue, { durable: true });
    await this.channel.assertQueue(dlqQueue, { durable: true });

    await this.channel.bindQueue(processQueue, exchange, processQueue);
    await this.channel.bindQueue(dlqQueue, exchange, dlqQueue);
  }
}
