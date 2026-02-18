import { Repository } from 'typeorm';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Product } from '../../infrastructure/entities/product.entity';

export enum ProductSort {
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  ALPHABETICAL_ASC = 'alphabetical_asc',
  ALPHABETICAL_DESC = 'alphabetical_desc',
  NEWEST = 'newest',
}

export type FindProductsInput = {
  search?: string;
  sort?: ProductSort;
};

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  async findProducts(input: FindProductsInput): Promise<Product[]> {
    const search = input.search?.trim();
    const sort = input.sort ?? ProductSort.PRICE_ASC;

    const query = this.productsRepository
      .createQueryBuilder('product')
      .where('product.is_active = :isActive', { isActive: true });

    if (search) {
      query.andWhere('product.title ILIKE :search', { search: `%${search}%` });
    }

    if (sort === ProductSort.PRICE_ASC || sort === ProductSort.PRICE_DESC) {
      query.orderBy(
        'product.price_cents',
        sort === ProductSort.PRICE_DESC ? 'DESC' : 'ASC',
      );
    } else if (
      sort === ProductSort.ALPHABETICAL_ASC ||
      sort === ProductSort.ALPHABETICAL_DESC
    ) {
      query.orderBy(
        'product.title',
        sort === ProductSort.ALPHABETICAL_DESC ? 'DESC' : 'ASC',
      );
    } else {
      query.orderBy('product.created_at', 'DESC');
    }

    return query.getMany();
  }
}
