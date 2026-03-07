import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFileRecords1740100000000 implements MigrationInterface {
  name = 'AddFileRecords1740100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."file_records_purpose_enum" AS ENUM('USER_AVATAR', 'PRODUCT_IMAGE')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."file_records_status_enum" AS ENUM('PENDING', 'READY')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."file_records_visibility_enum" AS ENUM('PRIVATE', 'PUBLIC')`,
    );

    await queryRunner.query(
      `CREATE TABLE "file_records" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "owner_id" uuid NOT NULL,
        "purpose" "public"."file_records_purpose_enum" NOT NULL,
        "entity_id" uuid NOT NULL,
        "key" text NOT NULL,
        "content_type" text NOT NULL,
        "size" integer NOT NULL,
        "status" "public"."file_records_status_enum" NOT NULL DEFAULT 'PENDING',
        "visibility" "public"."file_records_visibility_enum" NOT NULL DEFAULT 'PRIVATE',
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_file_records_id" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_file_records_key_unique" ON "file_records" ("key")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_file_records_owner_id" ON "file_records" ("owner_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_file_records_purpose_entity_id" ON "file_records" ("purpose", "entity_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_file_records_status" ON "file_records" ("status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_file_records_status"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_file_records_purpose_entity_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_file_records_owner_id"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_file_records_key_unique"`,
    );

    await queryRunner.query(`DROP TABLE "file_records"`);

    await queryRunner.query(
      `DROP TYPE "public"."file_records_visibility_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."file_records_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."file_records_purpose_enum"`);
  }
}
