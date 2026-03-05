import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';

import { OrderItem } from './order-item.entity';
import { User } from './user.entity';

export enum OrderStatus {
  NEW = 'NEW',
  PAID = 'PAID',
  CANCELED = 'CANCELED',
}

@Entity({ name: 'orders' })
@Index(['userId', 'idempotencyKey'], { unique: true })
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.NEW })
  status!: OrderStatus;

  @Column({ type: 'int', default: 0, name: 'total_amount_cents' })
  totalAmountCents!: number;

  @Column({ type: 'char', length: 3, default: 'UAH' })
  currency!: string;

  @Column({ type: 'uuid', name: 'idempotency_key' })
  idempotencyKey!: string;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: false })
  items!: OrderItem[];

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
