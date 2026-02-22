import { OrderStatus } from '../../../domain/orders/order-status';

export type FindOrdersDateRangeInput = {
  dateFrom?: Date | string;
  dateTo?: Date | string;
};

export type FindOrdersFilterInput = FindOrdersDateRangeInput & {
  status?: OrderStatus;
};

export type FindOrdersPaginationInput = {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
};
