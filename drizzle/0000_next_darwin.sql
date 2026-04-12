CREATE TABLE "butterfly_species" (
	"id" serial PRIMARY KEY NOT NULL,
	"scientific_name" text NOT NULL,
	"common_name" text NOT NULL,
	"family" text NOT NULL,
	"sub_family" text NOT NULL,
	"lifespan_days" integer NOT NULL,
	"range" text[] NOT NULL,
	"description" text,
	"host_plant" text,
	"habitat" text,
	"fun_facts" text,
	"img_wings_open" text,
	"img_wings_closed" text,
	"extra_img_1" text,
	"extra_img_2" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "butterfly_species_scientific_name_unique" UNIQUE("scientific_name")
);
--> statement-breakpoint
CREATE TABLE "butterfly_species_institution" (
	"id" serial PRIMARY KEY NOT NULL,
	"butterfly_species_id" integer NOT NULL,
	"institution_id" integer NOT NULL,
	"common_name_override" text,
	"lifespan_override" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "in_flight" (
	"id" serial PRIMARY KEY NOT NULL,
	"institution_id" integer NOT NULL,
	"release_event_id" integer NOT NULL,
	"shipment_item_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "institution_news" (
	"id" serial PRIMARY KEY NOT NULL,
	"institution_id" integer NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"image_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "institutions" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"street_address" text NOT NULL,
	"extended_address" text,
	"city" text NOT NULL,
	"state_province" text NOT NULL,
	"postal_code" text NOT NULL,
	"time_zone" text,
	"country" text NOT NULL,
	"phone_number" text,
	"email_address" text,
	"iabes_member" boolean DEFAULT false NOT NULL,
	"theme_colors" text[],
	"website_url" text,
	"facility_image_url" text,
	"logo_url" text,
	"description" text,
	"social_links" jsonb,
	"stats_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "institutions_slug_unique" UNIQUE("slug"),
	CONSTRAINT "institutions_email_address_unique" UNIQUE("email_address")
);
--> statement-breakpoint
CREATE TABLE "release_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"institution_id" integer NOT NULL,
	"shipment_id" integer NOT NULL,
	"release_date" timestamp NOT NULL,
	"released_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_release_event_id_per_institution" UNIQUE("institution_id","id")
);
--> statement-breakpoint
CREATE TABLE "shipment_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"institution_id" integer NOT NULL,
	"shipment_id" integer NOT NULL,
	"butterfly_species_id" integer NOT NULL,
	"number_received" integer NOT NULL,
	"emerged_in_transit" integer DEFAULT 0 NOT NULL,
	"damaged_in_transit" integer DEFAULT 0 NOT NULL,
	"diseased_in_transit" integer DEFAULT 0 NOT NULL,
	"parasite" integer DEFAULT 0 NOT NULL,
	"non_emergence" integer DEFAULT 0 NOT NULL,
	"poor_emergence" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_shipment_item_id_per_institution" UNIQUE("institution_id","id")
);
--> statement-breakpoint
CREATE TABLE "shipments" (
	"id" serial PRIMARY KEY NOT NULL,
	"institution_id" integer NOT NULL,
	"supplier_code" text NOT NULL,
	"shipment_date" timestamp NOT NULL,
	"arrival_date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_shipment_id_per_institution" UNIQUE("institution_id","id")
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" serial PRIMARY KEY NOT NULL,
	"institution_id" integer NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"country" text NOT NULL,
	"website_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_supplier_per_institution" UNIQUE("institution_id","code"),
	CONSTRAINT "unique_supplier_id_per_institution" UNIQUE("institution_id","id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"institution_id" integer NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "butterfly_species_institution" ADD CONSTRAINT "butterfly_species_institution_butterfly_species_id_butterfly_species_id_fk" FOREIGN KEY ("butterfly_species_id") REFERENCES "public"."butterfly_species"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "butterfly_species_institution" ADD CONSTRAINT "butterfly_species_institution_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "in_flight" ADD CONSTRAINT "in_flight_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "in_flight" ADD CONSTRAINT "fk_in_flight_event_institution" FOREIGN KEY ("institution_id","release_event_id") REFERENCES "public"."release_events"("institution_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "in_flight" ADD CONSTRAINT "fk_in_flight_shipment_item_institution" FOREIGN KEY ("institution_id","shipment_item_id") REFERENCES "public"."shipment_items"("institution_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institution_news" ADD CONSTRAINT "institution_news_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_events" ADD CONSTRAINT "release_events_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_events" ADD CONSTRAINT "fk_release_events_shipment_institution" FOREIGN KEY ("institution_id","shipment_id") REFERENCES "public"."shipments"("institution_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_items" ADD CONSTRAINT "shipment_items_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_items" ADD CONSTRAINT "shipment_items_butterfly_species_id_butterfly_species_id_fk" FOREIGN KEY ("butterfly_species_id") REFERENCES "public"."butterfly_species"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_items" ADD CONSTRAINT "fk_shipment_items_shipment_institution" FOREIGN KEY ("institution_id","shipment_id") REFERENCES "public"."shipments"("institution_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "fk_shipments_supplier_code" FOREIGN KEY ("institution_id","supplier_code") REFERENCES "public"."suppliers"("institution_id","code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_institution_species" ON "butterfly_species_institution" USING btree ("butterfly_species_id","institution_id");--> statement-breakpoint
CREATE INDEX "idx_bsi_institution_id" ON "butterfly_species_institution" USING btree ("institution_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_in_flight_shipment_item" ON "in_flight" USING btree ("release_event_id","shipment_item_id");--> statement-breakpoint
CREATE INDEX "idx_in_flight_institution_shipment_item" ON "in_flight" USING btree ("institution_id","shipment_item_id");--> statement-breakpoint
CREATE INDEX "idx_institution_news_institution_id" ON "institution_news" USING btree ("institution_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_shipment_species" ON "shipment_items" USING btree ("shipment_id","butterfly_species_id");--> statement-breakpoint
CREATE INDEX "idx_shipment_items_institution_species" ON "shipment_items" USING btree ("institution_id","butterfly_species_id");--> statement-breakpoint
CREATE INDEX "idx_users_institution_id" ON "users" USING btree ("institution_id");