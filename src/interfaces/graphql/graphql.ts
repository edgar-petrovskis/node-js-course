
/*
 * -------------------------------------------------------
 * THIS FILE WAS AUTOMATICALLY GENERATED (DO NOT MODIFY)
 * -------------------------------------------------------
 */

/* tslint:disable */
/* eslint-disable */

export enum OrderStatus {
    NEW = "NEW",
    PAID = "PAID",
    CANCELED = "CANCELED"
}

export class OrdersFilterInput {
    status?: Nullable<OrderStatus>;
    dateFrom?: Nullable<DateTime>;
    dateTo?: Nullable<DateTime>;
}

export class OrdersPaginationInput {
    first?: Nullable<number>;
    after?: Nullable<string>;
    last?: Nullable<number>;
    before?: Nullable<string>;
}

export class Product {
    id: string;
    title: string;
    description?: Nullable<string>;
    priceCents: number;
    currency: string;
    stock: number;
    isActive: boolean;
    createdAt: DateTime;
    updatedAt: DateTime;
}

export class OrderItem {
    id: string;
    orderId: string;
    productId: string;
    quantity: number;
    priceAtPurchaseCents: number;
    currency: string;
    createdAt: DateTime;
    product: Product;
}

export class Order {
    id: string;
    userId: string;
    status: OrderStatus;
    totalAmountCents: number;
    currency: string;
    idempotencyKey: string;
    items: OrderItem[];
    createdAt: DateTime;
    updatedAt: DateTime;
}

export class PageInfo {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: Nullable<string>;
    endCursor?: Nullable<string>;
}

export class OrdersConnection {
    nodes: Order[];
    totalCount: number;
    pageInfo: PageInfo;
}

export abstract class IQuery {
    abstract hello(): string | Promise<string>;

    abstract orders(filter?: Nullable<OrdersFilterInput>, pagination?: Nullable<OrdersPaginationInput>): OrdersConnection | Promise<OrdersConnection>;
}

export type DateTime = any;
type Nullable<T> = T | null;
