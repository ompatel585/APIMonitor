import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIncidents1789660893237 implements MigrationInterface {
    name = 'AddIncidents1789660893237'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "incidents" ("id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "organization_id" uuid NOT NULL, "project_id" uuid NOT NULL, "monitor_id" uuid NOT NULL, "status" character varying NOT NULL DEFAULT 'OPEN', "cause" character varying NOT NULL, "severity" character varying NOT NULL DEFAULT 'MAJOR', "started_at" TIMESTAMP WITH TIME ZONE NOT NULL, "acknowledged_at" TIMESTAMP WITH TIME ZONE, "acknowledged_by" uuid, "resolved_at" TIMESTAMP WITH TIME ZONE, "resolved_by" uuid, "duration_seconds" integer, "failure_count" integer NOT NULL DEFAULT '1', "is_flapping" boolean NOT NULL DEFAULT false, "last_failure_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_ccb34c01719889017e2246469f9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_96a7dedf1cdff01a643625ee7b" ON "incidents" ("project_id", "started_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_0716f3bb25498f6b655aa922a0" ON "incidents" ("organization_id", "started_at") `);
        await queryRunner.query(`CREATE TABLE "incident_events" ("id" uuid NOT NULL, "incident_id" uuid NOT NULL, "type" character varying NOT NULL, "message" character varying(500), "actor_id" uuid, "metadata" jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_1230e0a50df3503eed115634297" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_3b4389a6e18d2c3e91f3910014" ON "incident_events" ("incident_id", "created_at") `);
        await queryRunner.query(`ALTER TABLE "incidents" ADD CONSTRAINT "FK_fbabc7192bfdb38bb6c2d0f7775" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "incidents" ADD CONSTRAINT "FK_6075f79451f62de7bf4d5682111" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "incidents" ADD CONSTRAINT "FK_fc28fc30d8458756861ec6466e4" FOREIGN KEY ("monitor_id") REFERENCES "monitors"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "incident_events" ADD CONSTRAINT "FK_390f216bd2d62482f4a2602b5e8" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);

        // The core invariant: at most one OPEN incident per monitor. This is the
        // real guarantee behind incidents/CLAUDE.md §1 — the Redis lock only
        // avoids routine contention. Hand-written because TypeORM's @Index
        // decorator cannot express a partial (WHERE) index.
        await queryRunner.query(
            `CREATE UNIQUE INDEX "UQ_incidents_one_open_per_monitor" ON "incidents" ("monitor_id") WHERE "resolved_at" IS NULL`,
        );

        // Open-incident dashboards (CLAUDE.md §7) — covered by the same partial
        // predicate so the planner can use it for "all open incidents in org".
        await queryRunner.query(
            `CREATE INDEX "IDX_incidents_open_by_org" ON "incidents" ("organization_id", "started_at") WHERE "resolved_at" IS NULL`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_incidents_open_by_org"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_incidents_one_open_per_monitor"`);
        await queryRunner.query(`ALTER TABLE "incident_events" DROP CONSTRAINT "FK_390f216bd2d62482f4a2602b5e8"`);
        await queryRunner.query(`ALTER TABLE "incidents" DROP CONSTRAINT "FK_fc28fc30d8458756861ec6466e4"`);
        await queryRunner.query(`ALTER TABLE "incidents" DROP CONSTRAINT "FK_6075f79451f62de7bf4d5682111"`);
        await queryRunner.query(`ALTER TABLE "incidents" DROP CONSTRAINT "FK_fbabc7192bfdb38bb6c2d0f7775"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3b4389a6e18d2c3e91f3910014"`);
        await queryRunner.query(`DROP TABLE "incident_events"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0716f3bb25498f6b655aa922a0"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_96a7dedf1cdff01a643625ee7b"`);
        await queryRunner.query(`DROP TABLE "incidents"`);
    }

}
