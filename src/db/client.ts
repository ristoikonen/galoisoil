import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";

const databaseUrl = Bun.env.TURSO_DATABASE_URL || "file:oil.db";
const authToken = Bun.env.TURSO_AUTH_TOKEN;

// Initialize LibSQL / Turso client
export const tursoClient: Client = createClient({
  url: databaseUrl,
  authToken: databaseUrl.startsWith("file:") ? undefined : authToken,
});

export const db: LibSQLDatabase<typeof schema> = drizzle(tursoClient, { schema });

/**
 * Ensures required Turso tables exist without needing external migrations.
 */
export async function ensureTablesExist(): Promise<void> {
  await tursoClient.execute(`
    CREATE TABLE IF NOT EXISTS quantized_series (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      raw_price REAL NOT NULL,
      return_pct REAL NOT NULL,
      field_type TEXT NOT NULL,
      symbol INTEGER NOT NULL,
      symbol_label TEXT,
      params_json TEXT,
      created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
  `);

  await tursoClient.execute(`
    CREATE INDEX IF NOT EXISTS idx_quantized_field_date 
    ON quantized_series (field_type, date);
  `);

  await tursoClient.execute(`
    CREATE TABLE IF NOT EXISTS lfsr_runs (
      id TEXT PRIMARY KEY,
      created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      field_type TEXT NOT NULL,
      window_size INTEGER NOT NULL,
      linear_complexity INTEGER NOT NULL,
      polynomial_coeffs TEXT NOT NULL,
      predicted_symbol INTEGER NOT NULL,
      actual_symbol INTEGER,
      is_hit INTEGER,
      metadata_json TEXT
    );
  `);
}
