import { In, Repository } from 'typeorm';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Product } from '../entities/product.entity';

@Injectable()
export class ProductsRepository {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  async findByIds(productIds: readonly string[]): Promise<Product[]> {
    if (productIds.length === 0) {
      return [];
    }

    return this.productsRepository.find({
      where: { id: In([...productIds]) },
    });
  }
}
