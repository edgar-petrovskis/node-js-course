import { existsSync } from 'node:fs';

import dotenv from 'dotenv';
import { In } from 'typeorm';

import dataSource from '../src/infrastructure/database/data-source';
import { Product } from '../src/infrastructure/entities/product.entity';
import { User, UserRole } from '../src/infrastructure/entities/user.entity';

const envFile =
  process.env.DOTENV_CONFIG_PATH ||
  (existsSync('.env.local') ? '.env.local' : '.env');

dotenv.config({ path: envFile });

const usersSeed = [
  {
    email: 'admin@coffee.local',
    passwordHash: '$2b$10$admin.seed.hash.placeholder',
    role: UserRole.ADMIN,
    refreshTokenHash: null,
  },
  {
    email: 'user@coffee.local',
    passwordHash: '$2b$10$user.seed.hash.placeholder',
    role: UserRole.USER,
    refreshTokenHash: null,
  },
];

const productsSource: Array<[string, string, number, string, number]> = [
  [
    'Espresso Classic',
    'Bold and intense single-shot espresso',
    28000,
    'UAH',
    120,
  ],
  ['Espresso Doppio', 'Double espresso with rich crema', 36000, 'UAH', 110],
  ['Americano Smooth', 'Espresso diluted with hot water', 32000, 'UAH', 150],
  [
    'Cappuccino Velvet',
    'Espresso with steamed milk and foam',
    44000,
    'UAH',
    140,
  ],
  ['Latte House', 'Creamy latte with balanced flavor', 48000, 'UAH', 160],
  ['Flat White', 'Microfoam milk with double espresso', 46000, 'UAH', 130],
  ['Mocha Dark', 'Espresso with chocolate and steamed milk', 52000, 'UAH', 90],
  ['Caramel Macchiato', 'Vanilla latte with caramel drizzle', 54000, 'UAH', 100],
  ['Vanilla Latte', 'House latte infused with vanilla', 50000, 'UAH', 145],
  [
    'Hazelnut Latte',
    'Nutty latte with toasted hazelnut syrup',
    51200,
    'UAH',
    125,
  ],
  ['Cortado', 'Equal parts espresso and warm milk', 39200, 'UAH', 95],
  ['Ristretto', 'Short concentrated espresso shot', 30400, 'UAH', 85],
  [
    'Cold Brew Original',
    'Slow-steeped cold coffee, smooth finish',
    56000,
    'UAH',
    170,
  ],
  ['Nitro Cold Brew', 'Cold brew infused with nitrogen', 62000, 'UAH', 80],
  ['Iced Americano', 'Chilled americano over ice', 36000, 'UAH', 180],
  ['Iced Latte', 'Cold milk latte on ice', 46000, 'UAH', 175],
  ['Iced Mocha', 'Iced chocolate latte', 52000, 'UAH', 120],
  ['Affogato', 'Vanilla ice cream with espresso shot', 58000, 'UAH', 70],
  [
    'Irish Cream Coffee',
    'Coffee with creamy Irish-style notes',
    55200,
    'UAH',
    75,
  ],
  [
    'Filter Brew Daily',
    'Clean filter coffee for all-day drink',
    34000,
    'UAH',
    190,
  ],
  ['Kenya Single Origin', 'Bright acidity, berry finish', 64000, 'UAH', 65],
  [
    'Ethiopia Single Origin',
    'Floral aroma with citrus profile',
    64800,
    'UAH',
    60,
  ],
  [
    'Colombia Single Origin',
    'Balanced body with cocoa aftertaste',
    63200,
    'UAH',
    68,
  ],
  ['Decaf House Blend', 'Full flavor without caffeine', 48000, 'UAH', 105],
];

const productsSeed = productsSource.map(
  ([title, description, priceCents, currency, stock]) => ({
    title,
    description,
    priceCents,
    currency,
    stock,
    isActive: true,
  }),
);

async function seed() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Seeding is disabled in production');
  }

  await dataSource.initialize();

  try {
    const usersRepository = dataSource.getRepository(User);
    const productsRepository = dataSource.getRepository(Product);

    await usersRepository.upsert(usersSeed, ['email']);

    const existingProducts = await productsRepository.find({
      where: { title: In(productsSeed.map((product) => product.title)) },
      select: { id: true, title: true },
    });
    const productIdByTitle = new Map(
      existingProducts.map((product) => [product.title, product.id]),
    );
    const productsForSave = productsSeed.map((product) => ({
      ...product,
      id: productIdByTitle.get(product.title),
    }));
    await productsRepository.save(productsForSave);

    const users = await usersRepository.find({
      where: { email: In(usersSeed.map((user) => user.email)) },
      select: { email: true, role: true },
      order: { email: 'ASC' },
    });

    const productsInStock = await productsRepository
      .createQueryBuilder('product')
      .where('product.title IN (:...titles)', {
        titles: productsSeed.map((product) => product.title),
      })
      .andWhere('product.stock > 0')
      .getCount();

    console.log('[seed] users:', users);
    console.log('[seed] products_with_stock_gt_0:', productsInStock);
  } finally {
    await dataSource.destroy();
  }
}

seed().catch((error) => {
  console.error('[seed] failed:', error);
  process.exit(1);
});
