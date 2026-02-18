import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderResponseItemDto {
  @ApiProperty({ example: 'dc09f798-5e60-4edd-bbc5-fc0980479767' })
  productId!: string;

  @ApiProperty({ example: 2 })
  quantity!: number;

  @ApiProperty({ example: 48000 })
  priceAtPurchase!: number;
}

export class CreateOrderResponseDto {
  @ApiProperty({ example: '79d01c78-7dc9-4794-82e1-91cfd4bdcc18' })
  id!: string;

  @ApiProperty({ example: 'NEW' })
  status!: string;

  @ApiProperty({ example: 132000 })
  totalAmount!: number;

  @ApiProperty({ type: () => [CreateOrderResponseItemDto] })
  items!: CreateOrderResponseItemDto[];
}
