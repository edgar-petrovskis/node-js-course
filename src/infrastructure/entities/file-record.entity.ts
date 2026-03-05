import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum FilePurpose {
  USER_AVATAR = 'USER_AVATAR',
  PRODUCT_IMAGE = 'PRODUCT_IMAGE',
}

export enum FileStatus {
  PENDING = 'PENDING',
  READY = 'READY',
}

export enum FileVisibility {
  PRIVATE = 'PRIVATE',
  PUBLIC = 'PUBLIC',
}

@Entity({ name: 'file_records' })
@Index(['ownerId'])
@Index(['purpose', 'entityId'])
@Index(['status'])
export class FileRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'owner_id' })
  ownerId!: string;

  @Column({ type: 'enum', enum: FilePurpose })
  purpose!: FilePurpose;

  @Column({ type: 'uuid', name: 'entity_id' })
  entityId!: string;

  @Index({ unique: true })
  @Column({ type: 'text' })
  key!: string;

  @Column({ type: 'text', name: 'content_type' })
  contentType!: string;

  @Column({ type: 'int' })
  size!: number;

  @Column({ type: 'enum', enum: FileStatus, default: FileStatus.PENDING })
  status!: FileStatus;

  @Column({
    type: 'enum',
    enum: FileVisibility,
    default: FileVisibility.PRIVATE,
  })
  visibility!: FileVisibility;

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt!: Date;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
