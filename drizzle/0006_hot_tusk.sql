CREATE TABLE "user_onboarding" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"institution_id" integer NOT NULL,
	"current_step" integer DEFAULT 1 NOT NULL,
	"completed_steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tour_completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_onboarding" ADD CONSTRAINT "user_onboarding_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_onboarding" ADD CONSTRAINT "user_onboarding_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_user_institution" ON "user_onboarding" USING btree ("user_id","institution_id");--> statement-breakpoint
CREATE INDEX "idx_onboarding_institution" ON "user_onboarding" USING btree ("institution_id");