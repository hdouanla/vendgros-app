CREATE TYPE "public"."bulk_import_status" AS ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'PARTIAL');--> statement-breakpoint
CREATE TABLE "bulk_import" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"file_name" varchar(255),
	"total_rows" integer NOT NULL,
	"success_count" integer DEFAULT 0 NOT NULL,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"status" "bulk_import_status" DEFAULT 'PENDING' NOT NULL,
	"results" text,
	"error_message" text,
	"publish_immediately" boolean DEFAULT false NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "listing" ADD COLUMN "currency" varchar(3) DEFAULT 'CAD' NOT NULL;--> statement-breakpoint
ALTER TABLE "listing" ADD COLUMN "scheduled_publish_at" timestamp;--> statement-breakpoint
ALTER TABLE "listing" ADD COLUMN "auto_publish_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "listing" ADD COLUMN "view_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "rating" ADD COLUMN "authenticity_score" double precision;--> statement-breakpoint
ALTER TABLE "rating" ADD COLUMN "authenticity_flags" text[] DEFAULT ARRAY[]::text[];--> statement-breakpoint
ALTER TABLE "rating" ADD COLUMN "ai_generated" boolean;--> statement-breakpoint
ALTER TABLE "rating" ADD COLUMN "last_authenticity_check_at" timestamp;--> statement-breakpoint
ALTER TABLE "reservation" ADD COLUMN "currency" varchar(3) DEFAULT 'CAD' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "fraud_risk_score" double precision;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "fraud_flags" text[] DEFAULT ARRAY[]::text[];--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "last_fraud_check_at" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "trust_score" integer;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "behavior_flags" text[] DEFAULT ARRAY[]::text[];--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "last_behavior_check_at" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "tenant_id" text;--> statement-breakpoint
ALTER TABLE "bulk_import" ADD CONSTRAINT "bulk_import_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bulk_import_user_idx" ON "bulk_import" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "bulk_import_status_idx" ON "bulk_import" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bulk_import_created_at_idx" ON "bulk_import" USING btree ("created_at");