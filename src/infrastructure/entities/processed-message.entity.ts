import {
  Entity,
  Column,
  CreateDateColumn,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';

import { Order } from './order.entity';

@Entity({ name: 'processed_messages' })
@Index(['orderId'])
export class ProcessedMessage {
  @PrimaryColumn({ type: 'uuid', name: 'message_id' })
  messageId!: string;

  @Column({ type: 'uuid', name: 'order_id' })
  orderId!: string;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @CreateDateColumn({ type: 'timestamptz', name: 'processed_at' })
  processedAt!: Date;
}
