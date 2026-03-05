import { ValidationPipe } from '@nestjs/common';
import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';

import { OrdersQueryService } from '../../application/orders/orders-query.service';
import { Product } from '../../infrastructure/entities/product.entity';

import {
  OrdersFilterArgsDto,
  OrdersPaginationArgsDto,
} from './dto/orders-query-args.dto';
import { ProductLoader } from './loaders/product.loader';

@Resolver()
export class OrdersResolver {
  constructor(private readonly ordersQueryService: OrdersQueryService) {}

  @Query('orders')
  orders(
    @Args(
      'filter',
      { nullable: true },
      new ValidationPipe({ transform: true, whitelist: true }),
    )
    filter?: OrdersFilterArgsDto,
    @Args(
      'pagination',
      { nullable: true },
      new ValidationPipe({ transform: true, whitelist: true }),
    )
    pagination?: OrdersPaginationArgsDto,
  ) {
    return this.ordersQueryService.listOrdersConnection(filter, pagination);
  }
}

@Resolver('OrderItem')
export class OrderItemResolver {
  constructor(private readonly productLoader: ProductLoader) {}

  @ResolveField('product')
  async product(
    @Parent() item: { productId: string },
  ): Promise<Product | null> {
    return this.productLoader.load(item.productId);
  }
}
