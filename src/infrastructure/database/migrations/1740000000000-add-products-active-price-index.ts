import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductsActivePriceIndex1740000000000 implements MigrationInterface {
  name = 'AddProductsActivePriceIndex1740000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "idx_products_active_price" ON "products" ("price_cents") WHERE "is_active" = true',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "idx_products_active_price"');
  }
}
