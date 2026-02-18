import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Check,
} from 'typeorm';

@Entity({ name: 'products' })
@Check(`"stock" >= 0`)
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'text' })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'int', name: 'price_cents' })
  priceCents!: number;

  @Column({ type: 'char', length: 3, default: 'UAH' })
  currency!: string;

  @Column({ type: 'int', default: 0 })
  stock!: number;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive!: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
