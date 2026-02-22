import { Args, Query, Resolver } from '@nestjs/graphql';

import { OrdersQueryService } from '../../application/orders/orders-query.service';
import { OrderStatus } from '../../domain/orders/order-status';

type OrdersFilterArgs = {
  status?: OrderStatus;
  dateFrom?: Date | string;
  dateTo?: Date | string;
};

type OrdersPaginationArgs = {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
};

@Resolver()
export class OrdersResolver {
  constructor(private readonly ordersQueryService: OrdersQueryService) {}

  @Query('orders')
  orders(
    @Args('filter', { nullable: true }) filter?: OrdersFilterArgs,
    @Args('pagination', { nullable: true }) pagination?: OrdersPaginationArgs,
  ) {
    return this.ordersQueryService.findOrdersConnection(filter, pagination);
  }
}
