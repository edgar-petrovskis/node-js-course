import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

import { Order } from './order.entity';
import { Product } from './product.entity';

@Entity({ name: 'order_items' })
@Index(['orderId'])
@Index(['productId'])
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  orderId!: string;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order!: Order;

  @Column({ type: 'uuid' })
  productId!: string;

  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'productId' })
  product!: Product;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ type: 'int' })
  priceAtPurchaseCents!: number;

  @Column({ type: 'char', length: 3, default: 'USD' })
  currency!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
