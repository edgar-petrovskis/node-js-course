import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUsersAvatarAndProductsImageFileId1740200000000
  implements MigrationInterface
{
  name = 'AddUsersAvatarAndProductsImageFileId1740200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "users" ADD COLUMN "avatar_file_id" uuid',
    );
    await queryRunner.query(
      'ALTER TABLE "products" ADD COLUMN "image_file_id" uuid',
    );

    await queryRunner.query(
      'CREATE INDEX "IDX_users_avatar_file_id" ON "users" ("avatar_file_id")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_products_image_file_id" ON "products" ("image_file_id")',
    );

    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "FK_users_avatar_file_id_file_records_id" FOREIGN KEY ("avatar_file_id") REFERENCES "file_records"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "products" ADD CONSTRAINT "FK_products_image_file_id_file_records_id" FOREIGN KEY ("image_file_id") REFERENCES "file_records"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "products" DROP CONSTRAINT "FK_products_image_file_id_file_records_id"',
    );
    await queryRunner.query(
      'ALTER TABLE "users" DROP CONSTRAINT "FK_users_avatar_file_id_file_records_id"',
    );

    await queryRunner.query('DROP INDEX "public"."IDX_products_image_file_id"');
    await queryRunner.query('DROP INDEX "public"."IDX_users_avatar_file_id"');

    await queryRunner.query('ALTER TABLE "products" DROP COLUMN "image_file_id"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "avatar_file_id"');
  }
}
