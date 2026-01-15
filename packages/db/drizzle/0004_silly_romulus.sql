CREATE TYPE "public"."verification_badge" AS ENUM('NONE', 'VERIFIED', 'TRUSTED', 'PREMIUM');--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "verification_badge" "verification_badge" DEFAULT 'NONE' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "verified_at" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "identity_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "identity_verification_method" varchar(50);--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "identity_verification_notes" text;