import DataLoader from 'dataloader';
import { DataSource, In } from 'typeorm';

import { Injectable, Scope } from '@nestjs/common';

import { Product } from '../../../infrastructure/entities/product.entity';

@Injectable({ scope: Scope.REQUEST })
export class ProductLoader {
  private readonly loader: DataLoader<string, Product | null>;

  constructor(private readonly dataSource: DataSource) {
    this.loader = new DataLoader<string, Product | null>(async (productIds) => {
      const products = await this.dataSource.getRepository(Product).find({
        where: { id: In([...productIds]) },
      });
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
