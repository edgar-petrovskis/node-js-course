import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderItemDto {
  @ApiProperty({
    example: 'dc09f798-5e60-4edd-bbc5-fc0980479767',
    description: 'Product identifier',
  })
  @IsUUID()
  productId!: string;

  @ApiProperty({
    example: 2,
    description: 'Requested amount of product units',
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateOrderDto {
  @ApiProperty({
    type: () => [CreateOrderItemDto],
    description: 'Order items to be purchased',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}
