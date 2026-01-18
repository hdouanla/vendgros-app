import postgres from "postgres";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, "../../../../.env.local") });

async function createAllTables() {
  console.log("🔨 Creating all tables with consolidated schema...\n");

  const connectionString = process.env.POSTGRES_URL;

  if (!connectionString) {
    console.error("❌ POSTGRES_URL environment variable not set");
    process.exit(1);
  }

  const sql = postgres(connectionString);

  try {
    // Enable PostGIS
    await sql`CREATE EXTENSION IF NOT EXISTS postgis;`;
    console.log("✓ PostGIS extension enabled");

    // Create enums
    await sql`
      DO $$ BEGIN
        CREATE TYPE user_type AS ENUM ('BUYER', 'SELLER_INDIVIDUAL', 'SELLER_MERCHANT', 'ADMIN');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    console.log("✓ Created user_type enum");

    await sql`
      DO $$ BEGIN
        CREATE TYPE account_status AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    console.log("✓ Created account_status enum");

    await sql`
      DO $$ BEGIN
        CREATE TYPE listing_status AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'RESERVED', 'COMPLETED', 'EXPIRED', 'CANCELLED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    console.log("✓ Created listing_status enum");

    await sql`
      DO $$ BEGIN
        CREATE TYPE reservation_status AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    console.log("✓ Created reservation_status enum");

    await sql`
      DO $$ BEGIN
        CREATE TYPE bulk_import_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'PARTIAL');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    console.log("✓ Created bulk_import_status enum");

    await sql`
      DO $$ BEGIN
        CREATE TYPE verification_badge AS ENUM ('NONE', 'VERIFIED', 'TRUSTED', 'PREMIUM');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    console.log("✓ Created verification_badge enum");

    // Create postal_code table
    await sql`
      CREATE TABLE IF NOT EXISTS postal_code (
        code VARCHAR(10) PRIMARY KEY,
        city VARCHAR(100) NOT NULL,
        province VARCHAR(2) NOT NULL,
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        location GEOGRAPHY(POINT, 4326)
      );
    `;
    console.log("✓ Created postal_code table");

    await sql`CREATE INDEX IF NOT EXISTS postal_code_location_idx ON postal_code USING GIST(location);`;

    // Create user table
    await sql`
      CREATE TABLE IF NOT EXISTS "user" (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT,
        password_hash TEXT,
        email_verified BOOLEAN NOT NULL DEFAULT false,
        phone_verified BOOLEAN NOT NULL DEFAULT false,
        account_status account_status NOT NULL DEFAULT 'ACTIVE',
        user_type user_type NOT NULL DEFAULT 'BUYER',
        language_preference VARCHAR(5) NOT NULL DEFAULT 'en',
        rating_average DOUBLE PRECISION DEFAULT 0,
        rating_count INTEGER NOT NULL DEFAULT 0,
        moderation_notes TEXT,
        verification_badge verification_badge NOT NULL DEFAULT 'NONE',
        identity_verified BOOLEAN NOT NULL DEFAULT false,
        identity_verification_method VARCHAR(50),
        identity_verification_notes TEXT,
        fraud_risk_score DOUBLE PRECISION,
        fraud_flags TEXT[] DEFAULT ARRAY[]::TEXT[],
        last_fraud_check_at TIMESTAMP,
        trust_score INTEGER,
        behavior_flags TEXT[] DEFAULT ARRAY[]::TEXT[],
        last_behavior_check_at TIMESTAMP,
        tenant_id TEXT,
        stripe_customer_id TEXT,
        stripe_account_id TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `;
    console.log("✓ Created user table");

    await sql`CREATE INDEX IF NOT EXISTS user_email_idx ON "user"(email);`;
    await sql`CREATE INDEX IF NOT EXISTS user_type_idx ON "user"(user_type);`;

    // Create listing table
    await sql`
      CREATE TABLE IF NOT EXISTS listing (
        id TEXT PRIMARY KEY,
        seller_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR(100) NOT NULL,
        photos TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
        price_per_piece DOUBLE PRECISION NOT NULL,
        quantity_total INTEGER NOT NULL,
        quantity_available INTEGER NOT NULL,
        max_per_buyer INTEGER,
        pickup_address TEXT NOT NULL,
        pickup_instructions TEXT,
        postal_code VARCHAR(10),
        location GEOGRAPHY(POINT, 4326),
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        status listing_status NOT NULL DEFAULT 'DRAFT',
        is_active BOOLEAN NOT NULL DEFAULT true,
        moderation_notes TEXT,
        published_at TIMESTAMP,
        scheduled_publish_at TIMESTAMP,
        auto_publish_enabled BOOLEAN NOT NULL DEFAULT false,
        ai_moderation_score DOUBLE PRECISION,
        ai_moderation_flags TEXT[] DEFAULT ARRAY[]::TEXT[],
        ai_moderated_at TIMESTAMP,
        view_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `;
    console.log("✓ Created listing table");

    await sql`CREATE INDEX IF NOT EXISTS listing_seller_idx ON listing(seller_id);`;
    await sql`CREATE INDEX IF NOT EXISTS listing_status_idx ON listing(status);`;
    await sql`CREATE INDEX IF NOT EXISTS listing_category_idx ON listing(category);`;
    await sql`CREATE INDEX IF NOT EXISTS listing_location_idx ON listing USING GIST(location);`;
    await sql`CREATE INDEX IF NOT EXISTS listing_is_active_idx ON listing(is_active);`;

    // Create reservation table
    await sql`
      CREATE TABLE IF NOT EXISTS reservation (
        id TEXT PRIMARY KEY,
        listing_id TEXT NOT NULL REFERENCES listing(id) ON DELETE CASCADE,
        buyer_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        quantity_reserved INTEGER NOT NULL,
        total_price DOUBLE PRECISION NOT NULL,
        deposit_amount DOUBLE PRECISION NOT NULL,
        qr_code_hash TEXT UNIQUE NOT NULL,
        verification_code VARCHAR(6) UNIQUE NOT NULL,
        status reservation_status NOT NULL DEFAULT 'PENDING',
        stripe_payment_intent_id TEXT,
        expires_at TIMESTAMP NOT NULL,
        completed_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `;
    console.log("✓ Created reservation table");

    await sql`CREATE INDEX IF NOT EXISTS reservation_listing_idx ON reservation(listing_id);`;
    await sql`CREATE INDEX IF NOT EXISTS reservation_buyer_idx ON reservation(buyer_id);`;
    await sql`CREATE INDEX IF NOT EXISTS reservation_status_idx ON reservation(status);`;
    await sql`CREATE INDEX IF NOT EXISTS reservation_qr_idx ON reservation(qr_code_hash);`;
    await sql`CREATE INDEX IF NOT EXISTS reservation_code_idx ON reservation(verification_code);`;

    // Create rating table
    await sql`
      CREATE TABLE IF NOT EXISTS rating (
        id TEXT PRIMARY KEY,
        reservation_id TEXT NOT NULL REFERENCES reservation(id) ON DELETE CASCADE,
        rater_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        rated_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
        comment TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;
    console.log("✓ Created rating table");

    await sql`CREATE INDEX IF NOT EXISTS rating_reservation_idx ON rating(reservation_id);`;
    await sql`CREATE INDEX IF NOT EXISTS rating_rated_idx ON rating(rated_id);`;

    // Create bulk_import table
    await sql`
      CREATE TABLE IF NOT EXISTS bulk_import (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        file_name VARCHAR(255),
        total_rows INTEGER NOT NULL,
        success_count INTEGER NOT NULL DEFAULT 0,
        failure_count INTEGER NOT NULL DEFAULT 0,
        status bulk_import_status NOT NULL DEFAULT 'PENDING',
        results TEXT,
        error_message TEXT,
        publish_immediately BOOLEAN NOT NULL DEFAULT false,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `;
    console.log("✓ Created bulk_import table");

    await sql`CREATE INDEX IF NOT EXISTS bulk_import_user_idx ON bulk_import(user_id);`;
    await sql`CREATE INDEX IF NOT EXISTS bulk_import_status_idx ON bulk_import(status);`;

    // Create conversation table
    await sql`
      CREATE TABLE IF NOT EXISTS conversation (
        id TEXT PRIMARY KEY,
        listing_id TEXT NOT NULL REFERENCES listing(id) ON DELETE CASCADE,
        buyer_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        seller_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        last_message_at TIMESTAMP NOT NULL DEFAULT NOW(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;
    console.log("✓ Created conversation table");

    await sql`CREATE INDEX IF NOT EXISTS conversation_listing_idx ON conversation(listing_id);`;
    await sql`CREATE INDEX IF NOT EXISTS conversation_buyer_idx ON conversation(buyer_id);`;
    await sql`CREATE INDEX IF NOT EXISTS conversation_seller_idx ON conversation(seller_id);`;

    // Create message table
    await sql`
      CREATE TABLE IF NOT EXISTS message (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL REFERENCES conversation(id) ON DELETE CASCADE,
        sender_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        is_encrypted BOOLEAN NOT NULL DEFAULT false,
        attachments TEXT[] DEFAULT ARRAY[]::TEXT[],
        is_read BOOLEAN NOT NULL DEFAULT false,
        read_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `;
    console.log("✓ Created message table");

    await sql`CREATE INDEX IF NOT EXISTS message_conversation_idx ON message(conversation_id);`;
    await sql`CREATE INDEX IF NOT EXISTS message_sender_idx ON message(sender_id);`;

    // Create better-auth tables (account, session, verification)
    await sql`
      CREATE TABLE IF NOT EXISTS account (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        provider_id TEXT NOT NULL,
        user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        access_token TEXT,
        refresh_token TEXT,
        id_token TEXT,
        access_token_expires_at TIMESTAMP,
        refresh_token_expires_at TIMESTAMP,
        scope TEXT,
        password TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `;
    console.log("✓ Created account table");

    await sql`CREATE INDEX IF NOT EXISTS account_user_idx ON account(user_id);`;

    await sql`
      CREATE TABLE IF NOT EXISTS session (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        expires_at TIMESTAMP NOT NULL,
        token TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        ip_address TEXT,
        user_agent TEXT
      );
    `;
    console.log("✓ Created session table");

    await sql`CREATE INDEX IF NOT EXISTS session_user_idx ON session(user_id);`;
    await sql`CREATE INDEX IF NOT EXISTS session_token_idx ON session(token);`;

    await sql`
      CREATE TABLE IF NOT EXISTS verification (
        id TEXT PRIMARY KEY,
        identifier TEXT NOT NULL,
        value TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    console.log("✓ Created verification table");

    console.log("\n✅ All tables created successfully!");
    console.log("\nNext steps:");
    console.log("1. Run: pnpm import-postal-codes");
    console.log("2. Run: pnpm setup-sample-data");

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Table creation failed:", error);
    await sql.end();
    process.exit(1);
  }
}

createAllTables();
