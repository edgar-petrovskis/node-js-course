import { MigrationInterface, QueryRunner } from 'typeorm';

export class OrdersRabbitmqFoundation1740300000000 implements MigrationInterface {
  name = 'OrdersRabbitmqFoundation1740300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."orders_status_enum_new" AS ENUM('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "status" TYPE "public"."orders_status_enum_new" USING (CASE "status"::text WHEN 'NEW' THEN 'PENDING' WHEN 'PAID' THEN 'PROCESSED' WHEN 'CANCELED' THEN 'FAILED' END)::"public"."orders_status_enum_new"`,
    );
    await queryRunner.query(`DROP TYPE "public"."orders_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."orders_status_enum_new" RENAME TO "orders_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'PENDING'`,
    );

    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN "processed_at" TIMESTAMPTZ`,
    );

    await queryRunner.query(
      `CREATE TABLE "processed_messages" ("message_id" uuid NOT NULL, "order_id" uuid NOT NULL, "processed_at" TIMESTAMPTZ NOT NULL DEFAULT now(), CONSTRAINT "PK_processed_messages_message_id" PRIMARY KEY ("message_id"), CONSTRAINT "FK_processed_messages_order_id_orders_id" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_processed_messages_order_id" ON "processed_messages" ("order_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_processed_messages_order_id"`,
    );
    await queryRunner.query(`DROP TABLE "processed_messages"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "processed_at"`);

    await queryRunner.query(
      `CREATE TYPE "public"."orders_status_enum_old" AS ENUM('NEW', 'PAID', 'CANCELED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "status" TYPE "public"."orders_status_enum_old" USING (CASE "status"::text WHEN 'PENDING' THEN 'NEW' WHEN 'PROCESSING' THEN 'NEW' WHEN 'PROCESSED' THEN 'PAID' WHEN 'FAILED' THEN 'CANCELED' END)::"public"."orders_status_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."orders_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."orders_status_enum_old" RENAME TO "orders_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'NEW'`,
    );
  }
}
