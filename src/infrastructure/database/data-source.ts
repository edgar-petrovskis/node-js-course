import { DataSource, DataSourceOptions } from 'typeorm';

import { OrderItem } from '../entities/order-item.entity';
import { Order } from '../entities/order.entity';
import { Product } from '../entities/product.entity';
import { User } from '../entities/user.entity';

const parsePort = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);

  return Number.isInteger(parsed) ? parsed : fallback;
};

type DatabaseConfigInput = {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
};

export const createDatabaseOptions = ({
  host,
  port,
  username,
  password,
  database,
}: DatabaseConfigInput): DataSourceOptions => ({
  type: 'postgres',
  host,
  port,
  username,
  password,
  database,
  synchronize: false,
});

const AppDataSource = new DataSource({
  ...createDatabaseOptions({
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: parsePort(process.env.DATABASE_PORT, 5432),
    username: process.env.DATABASE_USER ?? 'postgres',
    password: process.env.DATABASE_PASSWORD ?? 'postgres',
    database: process.env.DATABASE_NAME ?? 'node_course',
  }),
  entities: [User, Product, Order, OrderItem],
  migrations: ['src/infrastructure/database/migrations/*{.ts,.js}'],
});

export default AppDataSource;
