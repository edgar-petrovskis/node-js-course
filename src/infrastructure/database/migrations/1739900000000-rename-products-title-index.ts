import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameProductsTitleIndex1739900000000 implements MigrationInterface {
  name = 'RenameProductsTitleIndex1739900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER INDEX IF EXISTS "IDX_products_title" RENAME TO "idx_products_title"',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER INDEX IF EXISTS "idx_products_title" RENAME TO "IDX_products_title"',
    );
  }
}
