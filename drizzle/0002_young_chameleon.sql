ALTER TABLE "suppliers" DROP CONSTRAINT "unique_supplier_per_institution";--> statement-breakpoint
ALTER TABLE "suppliers" DROP CONSTRAINT "unique_supplier_id_per_institution";--> statement-breakpoint
ALTER TABLE "shipments" DROP CONSTRAINT "fk_shipments_supplier_code";--> statement-breakpoint
ALTER TABLE "suppliers" DROP CONSTRAINT "suppliers_institution_id_institutions_id_fk";--> statement-breakpoint
WITH "missing_supplier_codes" AS (
	SELECT
		"shipments"."supplier_code" AS "code",
		min("shipments"."institution_id") AS "institution_id"
	FROM "shipments"
	LEFT JOIN "suppliers" ON "suppliers"."code" = "shipments"."supplier_code"
	WHERE "suppliers"."id" IS NULL
	GROUP BY "shipments"."supplier_code"
)
INSERT INTO "suppliers" (
	"institution_id",
	"name",
	"code",
	"country",
	"website_url",
	"is_active",
	"created_at",
	"updated_at"
)
SELECT
	"missing_supplier_codes"."institution_id",
	"missing_supplier_codes"."code",
	"missing_supplier_codes"."code",
	'Unknown',
	NULL,
	false,
	now(),
	now()
FROM "missing_supplier_codes";--> statement-breakpoint
WITH "ranked_suppliers" AS (
	SELECT
		"id",
		row_number() OVER (
			PARTITION BY "code"
			ORDER BY "is_active" DESC, "updated_at" DESC, "created_at" DESC, "id" DESC
		) AS "dedupe_rank"
	FROM "suppliers"
)
DELETE FROM "suppliers"
USING "ranked_suppliers"
WHERE "suppliers"."id" = "ranked_suppliers"."id"
	AND "ranked_suppliers"."dedupe_rank" > 1;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "unique_supplier_code" UNIQUE("code");--> statement-breakpoint
ALTER TABLE "suppliers" DROP COLUMN "institution_id";--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "fk_shipments_supplier_code" FOREIGN KEY ("supplier_code") REFERENCES "public"."suppliers"("code") ON DELETE restrict ON UPDATE no action;
