export class CreateOrderResponseItemDto {
  productId!: string;
  quantity!: number;
  priceAtPurchase!: number;
}

export class CreateOrderResponseDto {
  id!: string;
  status!: string;
  totalAmount!: number;
  items!: CreateOrderResponseItemDto[];
}
