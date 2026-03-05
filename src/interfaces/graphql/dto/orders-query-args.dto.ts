import {
  IsEnum,
  IsDate,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

import type {
  FindOrdersFilterInput,
  FindOrdersPaginationInput,
} from '../../../application/orders/contracts/orders-query.contract';
import { OrderStatus } from '../../../domain/orders/order-status';

const MAX_PAGE_SIZE = 100;

export class OrdersFilterArgsDto implements FindOrdersFilterInput {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsDate()
  dateFrom?: Date;

  @IsOptional()
  @IsDate()
  dateTo?: Date;
}

export class OrdersPaginationArgsDto implements FindOrdersPaginationInput {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  first?: number;

  @IsOptional()
  @IsString()
  after?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  last?: number;

  @IsOptional()
  @IsString()
  before?: string;
}

export class OrdersQueryArgsDto {
  @IsOptional()
  filter?: OrdersFilterArgsDto;

  @IsOptional()
  pagination?: OrdersPaginationArgsDto;
}
