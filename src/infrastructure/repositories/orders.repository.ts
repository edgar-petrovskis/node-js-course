import { Repository } from 'typeorm';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import type {
  FindOrdersDateRangeInput,
  FindOrdersFilterInput,
} from '../../application/orders/contracts/orders-query.contract';
import { Order } from '../entities/order.entity';

@Injectable()
export class OrdersRepository {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
  ) {}

  async findOrdersByDateRange(
    input: FindOrdersDateRangeInput,
  ): Promise<Order[]> {
    const query = this.ordersRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'item')
      .orderBy('order.created_at', 'DESC');

    if (input.dateFrom) {
      query.andWhere('order.created_at >= :dateFrom', {
        dateFrom: input.dateFrom,
      });
    }

    if (input.dateTo) {
      query.andWhere('order.created_at <= :dateTo', { dateTo: input.dateTo });
    }

    return query.getMany();
  }

  async findOrdersByFilter(input: FindOrdersFilterInput): Promise<Order[]> {
    const query = this.ordersRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'item')
      .orderBy('order.created_at', 'DESC')
      .addOrderBy('order.id', 'DESC');

    if (input.status) {
      query.andWhere('order.status = :status', { status: input.status });
    }

    if (input.dateFrom) {
      query.andWhere('order.created_at >= :dateFrom', {
        dateFrom: input.dateFrom,
      });
    }

    if (input.dateTo) {
      query.andWhere('order.created_at <= :dateTo', { dateTo: input.dateTo });
    }

    return query.getMany();
  }
}
