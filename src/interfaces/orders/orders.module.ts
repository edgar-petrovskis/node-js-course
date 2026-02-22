import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { OrdersQueryService } from '../../application/orders/orders-query.service';
import { OrdersService } from '../../application/orders/orders.service';
import { OrderItem } from '../../infrastructure/entities/order-item.entity';
import { Order } from '../../infrastructure/entities/order.entity';
import { Product } from '../../infrastructure/entities/product.entity';
import { User } from '../../infrastructure/entities/user.entity';
import { OrdersRepository } from '../../infrastructure/repositories/orders.repository';
import { ProductsRepository } from '../../infrastructure/repositories/products.repository';

import { OrdersController } from './orders.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem, Product, User])],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    OrdersQueryService,
    OrdersRepository,
    ProductsRepository,
  ],
  exports: [
    OrdersService,
    OrdersQueryService,
    OrdersRepository,
    ProductsRepository,
  ],
})
export class OrdersModule {}
