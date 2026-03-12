import type { ChannelModel, ConfirmChannel } from 'amqplib';

import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';

@Injectable()
export class RabbitLifecycleService implements OnModuleDestroy {
  constructor(
    @Inject('RABBIT_CHANNEL') private readonly channel: ConfirmChannel,
    @Inject('RABBIT_CONNECTION') private readonly connection: ChannelModel,
  ) {}

  async onModuleDestroy(): Promise<void> {
    try {
      await this.channel.close();
    } catch {
      // Ignore close errors during shutdown.
    }

    try {
      await this.connection.close();
    } catch {
      // Ignore close errors during shutdown.
    }
  }
}
