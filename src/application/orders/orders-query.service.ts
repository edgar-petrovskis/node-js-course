import { isISO8601 } from 'class-validator';
import { DataSource } from 'typeorm';

import { BadRequestException, Injectable } from '@nestjs/common';

import { Order } from '../../infrastructure/entities/order.entity';

import {
  FindOrdersDateRangeInput,
  FindOrdersFilterInput,
  FindOrdersPaginationInput,
} from './contracts/orders-query.contract';

export type OrdersConnection = {
  nodes: Order[];
  totalCount: number;
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string | null;
    endCursor: string | null;
  };
};

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

@Injectable()
export class OrdersQueryService {
  constructor(private readonly dataSource: DataSource) {}

  async listOrdersConnection(
    filter: FindOrdersFilterInput = {},
    pagination: FindOrdersPaginationInput = {},
  ): Promise<OrdersConnection> {
    const normalizedPagination = this.normalizePagination(pagination);
    const orders = await this.findOrdersByFilter(filter);
    const totalCount = orders.length;
    const { startIndex, endIndex } = this.resolveWindowIndices(
      orders,
      normalizedPagination.after,
      normalizedPagination.before,
    );
    const windowItems = orders.slice(startIndex, endIndex);
    const nodes = normalizedPagination.first
      ? windowItems.slice(0, normalizedPagination.first)
      : windowItems.slice(windowItems.length - normalizedPagination.last);
    const pageStart = normalizedPagination.first
      ? startIndex
      : endIndex - nodes.length;
    const pageEnd = pageStart + nodes.length;

    return {
      nodes,
      totalCount,
      pageInfo: {
        hasPreviousPage: pageStart > 0,
        hasNextPage: pageEnd < orders.length,
        startCursor: nodes[0] ? this.toCursor(nodes[0]) : null,
        endCursor: nodes.length ? this.toCursor(nodes[nodes.length - 1]) : null,
      },
    };
  }

  async findOrdersByDateRange(
    input: FindOrdersDateRangeInput,
  ): Promise<Order[]> {
    const { dateFrom, dateTo } = this.normalizeDateRange(input);
    const query = this.dataSource
      .getRepository(Order)
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'item')
      .orderBy('order.created_at', 'DESC');

    if (dateFrom) query.andWhere('order.created_at >= :dateFrom', { dateFrom });
    if (dateTo) query.andWhere('order.created_at <= :dateTo', { dateTo });

    return query.getMany();
  }

  private async findOrdersByFilter(
    filter: FindOrdersFilterInput,
  ): Promise<Order[]> {
    const { dateFrom, dateTo } = this.normalizeDateRange(filter);
    const query = this.dataSource
      .getRepository(Order)
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'item')
      .orderBy('order.created_at', 'DESC')
      .addOrderBy('order.id', 'DESC');

    if (filter.status)
      query.andWhere('order.status = :status', { status: filter.status });
    if (dateFrom) query.andWhere('order.created_at >= :dateFrom', { dateFrom });
    if (dateTo) query.andWhere('order.created_at <= :dateTo', { dateTo });

    return query.getMany();
  }

  private normalizePagination({
    first,
    after,
    last,
    before,
  }: FindOrdersPaginationInput): Required<FindOrdersPaginationInput> {
    if (first && last)
      throw new BadRequestException('Use either first or last, not both');
    if (first !== undefined && first < 1)
      throw new BadRequestException('first must be greater than 0');
    if (last !== undefined && last < 1)
      throw new BadRequestException('last must be greater than 0');

    return {
      first: first
        ? Math.min(first, MAX_PAGE_SIZE)
        : last
          ? 0
          : DEFAULT_PAGE_SIZE,
      after: after ?? '',
      last: last ? Math.min(last, MAX_PAGE_SIZE) : 0,
      before: before ?? '',
    };
  }

  private resolveWindowIndices(
    orders: Order[],
    after?: string,
    before?: string,
  ): { startIndex: number; endIndex: number } {
    const startIndex = after
      ? this.findCursorIndex(orders, after, 'after') + 1
      : 0;
    const endIndex = before
      ? this.findCursorIndex(orders, before, 'before')
      : orders.length;
    if (startIndex > endIndex)
      throw new BadRequestException('Invalid cursor range');
    return { startIndex, endIndex };
  }

  private findCursorIndex(
    orders: Order[],
    cursor: string,
    cursorName: 'after' | 'before',
  ): number {
    const parsed = this.parseCursor(cursor, cursorName);
    const index = orders.findIndex(
      (order) =>
        order.id === parsed.id &&
        order.createdAt.toISOString() === parsed.createdAt,
    );
    if (index < 0)
      throw new BadRequestException(`${cursorName} cursor does not exist`);
    return index;
  }

  private toCursor(order: Order): string {
    return Buffer.from(
      JSON.stringify({
        id: order.id,
        createdAt: order.createdAt.toISOString(),
      }),
      'utf8',
    ).toString('base64');
  }

  private parseCursor(
    cursor: string,
    cursorName: 'after' | 'before',
  ): { id: string; createdAt: string } {
    try {
      const parsed = JSON.parse(
        Buffer.from(cursor, 'base64').toString('utf8'),
      ) as {
        id?: unknown;
        createdAt?: unknown;
      };
      if (
        typeof parsed.id !== 'string' ||
        typeof parsed.createdAt !== 'string'
      ) {
        throw new Error('Invalid cursor');
      }
      return { id: parsed.id, createdAt: parsed.createdAt };
    } catch {
      throw new BadRequestException(`${cursorName} cursor is invalid`);
    }
  }

  private normalizeDateRange({ dateFrom, dateTo }: FindOrdersDateRangeInput): {
    dateFrom?: Date;
    dateTo?: Date;
  } {
    const parsedDateFrom = this.parseDateInput(dateFrom, 'dateFrom');
    const parsedDateTo = this.parseDateInput(dateTo, 'dateTo');
    if (parsedDateFrom && parsedDateTo && parsedDateFrom > parsedDateTo) {
      throw new BadRequestException(
        'dateFrom must be less than or equal to dateTo',
      );
    }
    return { dateFrom: parsedDateFrom, dateTo: parsedDateTo };
  }

  private parseDateInput(
    value: Date | string | undefined,
    fieldName: 'dateFrom' | 'dateTo',
  ): Date | undefined {
    if (value === undefined || value === null) return undefined;

    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) {
        throw new BadRequestException(
          `${fieldName} must be a valid ISO 8601 date-time`,
        );
      }
      return value;
    }

    if (
      typeof value !== 'string' ||
      !isISO8601(value, { strict: true, strictSeparator: true })
    ) {
      throw new BadRequestException(
        `${fieldName} must be a valid ISO 8601 date-time`,
      );
    }

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
      throw new BadRequestException(
        `${fieldName} must be a valid ISO 8601 date-time`,
      );
    }

    return parsedDate;
  }
}
