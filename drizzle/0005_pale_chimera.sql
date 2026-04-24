CREATE TABLE "release_event_losses" (
	"id" serial PRIMARY KEY NOT NULL,
	"institution_id" integer NOT NULL,
	"release_event_id" integer NOT NULL,
	"shipment_item_id" integer NOT NULL,
	"damaged_in_transit" integer DEFAULT 0 NOT NULL,
	"diseased_in_transit" integer DEFAULT 0 NOT NULL,
	"parasite" integer DEFAULT 0 NOT NULL,
	"non_emergence" integer DEFAULT 0 NOT NULL,
	"poor_emergence" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ck_release_event_losses_damaged_nonnegative" CHECK ("release_event_losses"."damaged_in_transit" >= 0),
	CONSTRAINT "ck_release_event_losses_diseased_nonnegative" CHECK ("release_event_losses"."diseased_in_transit" >= 0),
	CONSTRAINT "ck_release_event_losses_parasite_nonnegative" CHECK ("release_event_losses"."parasite" >= 0),
	CONSTRAINT "ck_release_event_losses_non_emergence_nonnegative" CHECK ("release_event_losses"."non_emergence" >= 0),
	CONSTRAINT "ck_release_event_losses_poor_emergence_nonnegative" CHECK ("release_event_losses"."poor_emergence" >= 0)
);
--> statement-breakpoint
ALTER TABLE "release_event_losses" ADD CONSTRAINT "release_event_losses_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_event_losses" ADD CONSTRAINT "fk_release_event_losses_event_institution" FOREIGN KEY ("institution_id","release_event_id") REFERENCES "public"."release_events"("institution_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_event_losses" ADD CONSTRAINT "fk_release_event_losses_shipment_item_institution" FOREIGN KEY ("institution_id","shipment_item_id") REFERENCES "public"."shipment_items"("institution_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_release_event_losses_shipment_item" ON "release_event_losses" USING btree ("release_event_id","shipment_item_id");--> statement-breakpoint
CREATE INDEX "idx_release_event_losses_institution_event" ON "release_event_losses" USING btree ("institution_id","release_event_id");--> statement-breakpoint
CREATE INDEX "idx_release_event_losses_institution_shipment_item" ON "release_event_losses" USING btree ("institution_id","shipment_item_id");