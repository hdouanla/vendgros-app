ALTER TYPE "public"."user_type" ADD VALUE 'ADMIN';--> statement-breakpoint
ALTER TABLE "listing" ADD COLUMN "moderation_notes" text;--> statement-breakpoint
ALTER TABLE "listing" ADD COLUMN "published_at" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "moderation_notes" text;