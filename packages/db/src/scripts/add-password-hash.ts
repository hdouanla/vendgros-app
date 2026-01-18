import postgres from "postgres";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, "../../../../.env.local") });

async function addPasswordHash() {
  console.log("Adding password_hash column and verification_badge enum...\n");

  const connectionString = process.env.POSTGRES_URL;

  if (!connectionString) {
    console.error("❌ POSTGRES_URL environment variable not set");
    process.exit(1);
  }

  const sql = postgres(connectionString);

  try {
    // Create verification_badge enum if it doesn't exist
    await sql`
      DO $$ BEGIN
        CREATE TYPE verification_badge AS ENUM ('NONE', 'VERIFIED', 'TRUSTED', 'PREMIUM');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    console.log("✓ Created/verified verification_badge enum");

    // Add password_hash column
    await sql`
      ALTER TABLE "user"
      ADD COLUMN IF NOT EXISTS password_hash TEXT;
    `;
    console.log("✓ Added password_hash column");

    // Add verification_badge column if missing
    await sql`
      ALTER TABLE "user"
      ADD COLUMN IF NOT EXISTS verification_badge verification_badge NOT NULL DEFAULT 'NONE';
    `;
    console.log("✓ Added verification_badge column");

    // Add other missing columns
    await sql`
      ALTER TABLE "user"
      ADD COLUMN IF NOT EXISTS language_preference VARCHAR(5) NOT NULL DEFAULT 'en';
    `;
    console.log("✓ Added language_preference column");

    await sql`
      ALTER TABLE "user"
      ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP;
    `;
    console.log("✓ Added verified_at column");

    await sql`
      ALTER TABLE "user"
      ADD COLUMN IF NOT EXISTS identity_verified BOOLEAN NOT NULL DEFAULT false;
    `;
    console.log("✓ Added identity_verified column");

    await sql`
      ALTER TABLE "user"
      ADD COLUMN IF NOT EXISTS identity_verification_method VARCHAR(50);
    `;
    console.log("✓ Added identity_verification_method column");

    await sql`
      ALTER TABLE "user"
      ADD COLUMN IF NOT EXISTS identity_verification_notes TEXT;
    `;
    console.log("✓ Added identity_verification_notes column");

    await sql`
      ALTER TABLE "user"
      ADD COLUMN IF NOT EXISTS fraud_risk_score DOUBLE PRECISION;
    `;
    console.log("✓ Added fraud_risk_score column");

    await sql`
      ALTER TABLE "user"
      ADD COLUMN IF NOT EXISTS fraud_flags TEXT[] DEFAULT ARRAY[]::TEXT[];
    `;
    console.log("✓ Added fraud_flags column");

    await sql`
      ALTER TABLE "user"
      ADD COLUMN IF NOT EXISTS last_fraud_check_at TIMESTAMP;
    `;
    console.log("✓ Added last_fraud_check_at column");

    await sql`
      ALTER TABLE "user"
      ADD COLUMN IF NOT EXISTS trust_score INTEGER;
    `;
    console.log("✓ Added trust_score column");

    await sql`
      ALTER TABLE "user"
      ADD COLUMN IF NOT EXISTS behavior_flags TEXT[] DEFAULT ARRAY[]::TEXT[];
    `;
    console.log("✓ Added behavior_flags column");

    await sql`
      ALTER TABLE "user"
      ADD COLUMN IF NOT EXISTS last_behavior_check_at TIMESTAMP;
    `;
    console.log("✓ Added last_behavior_check_at column");

    await sql`
      ALTER TABLE "user"
      ADD COLUMN IF NOT EXISTS tenant_id TEXT;
    `;
    console.log("✓ Added tenant_id column");

    await sql`
      ALTER TABLE "user"
      ADD COLUMN IF NOT EXISTS moderation_notes TEXT;
    `;
    console.log("✓ Added moderation_notes column");

    console.log("\n✅ All missing columns added successfully!");

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    await sql.end();
    process.exit(1);
  }
}

addPasswordHash();
