import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { ApiPropertyOptional } from '@nestjs/swagger';

import { ProductSort } from '../../../application/products/products.service';

export class FindProductsQueryDto {
  @ApiPropertyOptional({
    example: 'espresso',
    description: 'Case-insensitive search by product title',
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({
    enum: ProductSort,
    example: ProductSort.PRICE_ASC,
    description: 'Sort mode for the products list',
  })
  @IsOptional()
  @IsEnum(ProductSort)
  sort?: ProductSort;
}
