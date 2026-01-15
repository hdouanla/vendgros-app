CREATE TYPE "public"."account_status" AS ENUM('UNVERIFIED', 'ACTIVE', 'SUSPENDED', 'BANNED');--> statement-breakpoint
CREATE TYPE "public"."listing_status" AS ENUM('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'RESERVED', 'COMPLETED', 'EXPIRED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."reservation_status" AS ENUM('PENDING', 'CONFIRMED', 'COMPLETED', 'NO_SHOW', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."user_type" AS ENUM('BUYER', 'SELLER_INDIVIDUAL', 'SELLER_MERCHANT');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listing" (
	"id" text PRIMARY KEY NOT NULL,
	"seller_id" text NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text NOT NULL,
	"category" varchar(100) NOT NULL,
	"photos" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"price_per_piece" double precision NOT NULL,
	"quantity_total" integer NOT NULL,
	"quantity_available" integer NOT NULL,
	"max_per_buyer" integer,
	"pickup_address" text NOT NULL,
	"pickup_instructions" text,
	"location" text,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"status" "listing_status" DEFAULT 'DRAFT' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "postal_code" (
	"code" varchar(7) PRIMARY KEY NOT NULL,
	"city" varchar(100) NOT NULL,
	"province" varchar(2) NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"location" text
);
--> statement-breakpoint
CREATE TABLE "rating" (
	"id" text PRIMARY KEY NOT NULL,
	"reservation_id" text NOT NULL,
	"rater_id" text NOT NULL,
	"rated_id" text NOT NULL,
	"score" integer NOT NULL,
	"comment" text,
	"is_visible" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reservation" (
	"id" text PRIMARY KEY NOT NULL,
	"listing_id" text NOT NULL,
	"buyer_id" text NOT NULL,
	"quantity_reserved" integer NOT NULL,
	"total_price" double precision NOT NULL,
	"deposit_amount" double precision NOT NULL,
	"qr_code_hash" text NOT NULL,
	"verification_code" varchar(6) NOT NULL,
	"status" "reservation_status" DEFAULT 'PENDING' NOT NULL,
	"stripe_payment_intent_id" text,
	"expires_at" timestamp NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reservation_qrCodeHash_unique" UNIQUE("qr_code_hash"),
	CONSTRAINT "reservation_verificationCode_unique" UNIQUE("verification_code")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"password_hash" text,
	"email_verified" boolean DEFAULT false NOT NULL,
	"phone_verified" boolean DEFAULT false NOT NULL,
	"account_status" "account_status" DEFAULT 'UNVERIFIED' NOT NULL,
	"user_type" "user_type" DEFAULT 'BUYER' NOT NULL,
	"language_preference" varchar(5) DEFAULT 'en' NOT NULL,
	"rating_average" double precision DEFAULT 0,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing" ADD CONSTRAINT "listing_seller_id_user_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating" ADD CONSTRAINT "rating_reservation_id_reservation_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating" ADD CONSTRAINT "rating_rater_id_user_id_fk" FOREIGN KEY ("rater_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating" ADD CONSTRAINT "rating_rated_id_user_id_fk" FOREIGN KEY ("rated_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservation" ADD CONSTRAINT "reservation_listing_id_listing_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listing"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservation" ADD CONSTRAINT "reservation_buyer_id_user_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "listing_seller_idx" ON "listing" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "listing_status_idx" ON "listing" USING btree ("status");--> statement-breakpoint
CREATE INDEX "listing_category_idx" ON "listing" USING btree ("category");--> statement-breakpoint
CREATE INDEX "listing_coords_idx" ON "listing" USING btree ("latitude","longitude");--> statement-breakpoint
CREATE INDEX "postal_code_coords_idx" ON "postal_code" USING btree ("latitude","longitude");--> statement-breakpoint
CREATE INDEX "rating_reservation_rater_idx" ON "rating" USING btree ("reservation_id","rater_id");--> statement-breakpoint
CREATE INDEX "rating_rater_idx" ON "rating" USING btree ("rater_id");--> statement-breakpoint
CREATE INDEX "rating_rated_idx" ON "rating" USING btree ("rated_id");--> statement-breakpoint
CREATE INDEX "reservation_listing_idx" ON "reservation" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "reservation_buyer_idx" ON "reservation" USING btree ("buyer_id");--> statement-breakpoint
CREATE INDEX "reservation_status_idx" ON "reservation" USING btree ("status");--> statement-breakpoint
CREATE INDEX "reservation_qr_code_hash_idx" ON "reservation" USING btree ("qr_code_hash");--> statement-breakpoint
CREATE INDEX "reservation_verification_code_idx" ON "reservation" USING btree ("verification_code");--> statement-breakpoint
CREATE INDEX "user_email_idx" ON "user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "user_phone_idx" ON "user" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "user_account_status_idx" ON "user" USING btree ("account_status");