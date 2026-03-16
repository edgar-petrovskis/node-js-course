import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { OrdersProcessingService } from '../../application/orders/orders-processing.service';
import { OrdersQueryService } from '../../application/orders/orders-query.service';
import { OrdersService } from '../../application/orders/orders.service';
import { OrderItem } from '../../infrastructure/entities/order-item.entity';
import { Order } from '../../infrastructure/entities/order.entity';
import { ProcessedMessage } from '../../infrastructure/entities/processed-message.entity';
import { Product } from '../../infrastructure/entities/product.entity';
import { OrdersPublisher } from '../../infrastructure/rabbit/orders.publisher';
import { RabbitModule } from '../../infrastructure/rabbit/rabbit.module';
import { OrdersRepository } from '../../infrastructure/repositories/orders.repository';
import { ProductsRepository } from '../../infrastructure/repositories/products.repository';

import { OrdersController } from './orders.controller';
import { OrdersWorker } from './orders.worker';

@Module({
  imports: [
    RabbitModule,
    TypeOrmModule.forFeature([Order, OrderItem, Product, ProcessedMessage]),
  ],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    OrdersProcessingService,
    OrdersQueryService,
    OrdersRepository,
    ProductsRepository,
    OrdersPublisher,
    OrdersWorker,
  ],
  exports: [
    OrdersService,
    OrdersQueryService,
    OrdersRepository,
    ProductsRepository,
  ],
})
export class OrdersModule {}
