import DataLoader from 'dataloader';

import { Injectable, Scope } from '@nestjs/common';

import { Product } from '../../../infrastructure/entities/product.entity';
import { ProductsRepository } from '../../../infrastructure/repositories/products.repository';

@Injectable({ scope: Scope.REQUEST })
export class ProductLoader {
  private readonly loader: DataLoader<string, Product | null>;

  constructor(private readonly productsRepository: ProductsRepository) {
    this.loader = new DataLoader<string, Product | null>(async (productIds) => {
      const products = await this.productsRepository.findByIds(productIds);
      const productsById = new Map(
        products.map((product) => [product.id, product]),
      );

      return productIds.map((productId) => productsById.get(productId) ?? null);
    });
  }

  load(productId: string): Promise<Product | null> {
    return this.loader.load(productId);
  }
}
