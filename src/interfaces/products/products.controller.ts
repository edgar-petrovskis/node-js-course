import { Controller, Get, Query } from '@nestjs/common';

import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { ProductsService } from '../../application/products/products.service';
import { ProductSort } from '../../application/products/products.service';
import { Product } from '../../infrastructure/entities/product.entity';

import { FindProductsQueryDto } from './dto/find-products-query.dto';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Get products with optional search and sorting' })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Case-insensitive search by product title',
  })
  @ApiQuery({
    name: 'sort',
    required: false,
    enum: ProductSort,
    description: 'Sorting mode',
  })
  @ApiOkResponse({
    description: 'List of products',
    type: Product,
    isArray: true,
  })
  async find(@Query() query: FindProductsQueryDto) {
    return this.productsService.findProducts(query);
  }
}
