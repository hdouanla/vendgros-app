import postgres from "postgres";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, "../../../../.env.local") });

async function checkAccountTable() {
  const connectionString = process.env.POSTGRES_URL;

  if (!connectionString) {
    console.error("❌ POSTGRES_URL environment variable not set");
    process.exit(1);
  }

  const sql = postgres(connectionString);

  try {
    const accounts = await sql`
      SELECT * FROM account
    `;

    console.log("Account table entries:");
    console.table(accounts);

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to check account table:", error);
    await sql.end();
    process.exit(1);
  }
}

checkAccountTable();
