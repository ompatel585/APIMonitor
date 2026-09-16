import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMonitorChecks1789569613995 implements MigrationInterface {
    name = 'AddMonitorChecks1789569613995'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "monitor_checks" ("id" uuid NOT NULL, "organization_id" uuid NOT NULL, "monitor_id" uuid NOT NULL, "succeeded" boolean NOT NULL, "status_code" integer, "latency_ms" integer NOT NULL, "error_message" character varying(500), "checked_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_25695040f44daaeee8656c5a3f0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_22038f29564cb547292d7a2e7e" ON "monitor_checks" ("organization_id", "monitor_id", "checked_at") `);
        await queryRunner.query(`ALTER TABLE "monitor_checks" ADD CONSTRAINT "FK_5e355bf185bc29f6ccd322a532c" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "monitor_checks" ADD CONSTRAINT "FK_2c99ca96a324c7af566742d153f" FOREIGN KEY ("monitor_id") REFERENCES "monitors"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "monitor_checks" DROP CONSTRAINT "FK_2c99ca96a324c7af566742d153f"`);
        await queryRunner.query(`ALTER TABLE "monitor_checks" DROP CONSTRAINT "FK_5e355bf185bc29f6ccd322a532c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_22038f29564cb547292d7a2e7e"`);
        await queryRunner.query(`DROP TABLE "monitor_checks"`);
    }

}
