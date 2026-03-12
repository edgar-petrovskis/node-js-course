import { connect, ChannelModel, ConfirmChannel } from 'amqplib';

import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { RabbitLifecycleService } from './rabbit-lifecycle.service';
import { RabbitTopologyBootstrapService } from './topology.bootstrap.service';

export const RABBIT_CONNECTION = 'RABBIT_CONNECTION';
export const RABBIT_CHANNEL = 'RABBIT_CHANNEL';

@Module({
  imports: [],
  controllers: [],
  providers: [
    RabbitLifecycleService,
    RabbitTopologyBootstrapService,
    {
      provide: RABBIT_CONNECTION,
      useFactory: (configService: ConfigService): Promise<ChannelModel> => {
        const url = configService.getOrThrow<string>('rabbitmq.url');
        return connect(url);
      },
      inject: [ConfigService],
    },
    {
      provide: RABBIT_CHANNEL,
      useFactory: (connection: ChannelModel): Promise<ConfirmChannel> => {
        return connection.createConfirmChannel();
      },
      inject: [RABBIT_CONNECTION],
    },
  ],
  exports: [RABBIT_CONNECTION, RABBIT_CHANNEL],
})
export class RabbitModule {}
