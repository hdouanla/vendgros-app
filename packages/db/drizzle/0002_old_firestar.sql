ALTER TABLE "listing" ADD COLUMN "ai_moderation_score" double precision;--> statement-breakpoint
ALTER TABLE "listing" ADD COLUMN "ai_moderation_flags" text[] DEFAULT ARRAY[]::text[];--> statement-breakpoint
ALTER TABLE "listing" ADD COLUMN "ai_moderated_at" timestamp;