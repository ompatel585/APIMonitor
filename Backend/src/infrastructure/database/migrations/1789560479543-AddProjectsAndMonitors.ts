import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProjectsAndMonitors1789560479543 implements MigrationInterface {
    name = 'AddProjectsAndMonitors1789560479543'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "projects" ("id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "organization_id" uuid NOT NULL, "name" character varying NOT NULL, "description" character varying, CONSTRAINT "PK_6271df0a7aed1d6c0691ce6ac50" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_585c8ce06628c70b70100bfb84" ON "projects" ("organization_id") `);
        await queryRunner.query(`CREATE TABLE "monitors" ("id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "organization_id" uuid NOT NULL, "project_id" uuid NOT NULL, "name" character varying NOT NULL, "url" character varying NOT NULL, "method" character varying NOT NULL DEFAULT 'GET', "headers" jsonb, "body" text, "interval_seconds" integer NOT NULL, "timeout_ms" integer NOT NULL DEFAULT '5000', "expected_status_codes" jsonb NOT NULL DEFAULT '[200]', "follow_redirects" boolean NOT NULL DEFAULT true, "degraded_threshold_ms" integer NOT NULL DEFAULT '2000', "is_active" boolean NOT NULL DEFAULT true, "consecutive_failure_threshold" integer NOT NULL DEFAULT '2', "consecutive_success_threshold" integer NOT NULL DEFAULT '2', "status" character varying NOT NULL DEFAULT 'PENDING', "last_check_at" TIMESTAMP WITH TIME ZONE, "last_latency_ms" integer, CONSTRAINT "PK_193902e2013887310490284cdbe" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_7fb539d16099baaa987162f303" ON "monitors" ("project_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_81ea4c64084cf6876f1c011881" ON "monitors" ("organization_id") `);
        await queryRunner.query(`ALTER TABLE "projects" ADD CONSTRAINT "FK_585c8ce06628c70b70100bfb842" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "monitors" ADD CONSTRAINT "FK_81ea4c64084cf6876f1c0118810" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "monitors" ADD CONSTRAINT "FK_7fb539d16099baaa987162f3039" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "monitors" DROP CONSTRAINT "FK_7fb539d16099baaa987162f3039"`);
        await queryRunner.query(`ALTER TABLE "monitors" DROP CONSTRAINT "FK_81ea4c64084cf6876f1c0118810"`);
        await queryRunner.query(`ALTER TABLE "projects" DROP CONSTRAINT "FK_585c8ce06628c70b70100bfb842"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_81ea4c64084cf6876f1c011881"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7fb539d16099baaa987162f303"`);
        await queryRunner.query(`DROP TABLE "monitors"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_585c8ce06628c70b70100bfb84"`);
        await queryRunner.query(`DROP TABLE "projects"`);
    }

}
