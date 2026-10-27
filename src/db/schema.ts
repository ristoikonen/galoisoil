import { sqliteTable, text, numeric, integer, index } from "drizzle-orm/sqlite-core";

import { sql } from "drizzle-orm";

// 1. Oil Prices Old Table
export const oilPricesOld = sqliteTable("oil_prices_old", {
  id: text("id").primaryKey().notNull(),
  period: text("period")
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)
    .notNull(),
  series: text("series").notNull(), // SQLite treats VARCHAR as TEXT
  value: numeric("value").notNull(), // Maps DECIMAL(10,2) cleanly to numeric
});

// 2. Oil Prices Table
export const oilPrices = sqliteTable("oil_prices", {
  id: text("id").primaryKey().notNull(),
  period: text("period")
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)
    .notNull(),
  duoarea: text("duoarea"),
  areaName: text("area_name"),
  product: text("product"),
  productName: text("product_name"),
  process: text("process"),
  processName: text("process_name"),
  series: text("series").notNull(),
  seriesDescription: text("series_description"),
  value: numeric("value").notNull(),
  units: text("units"),
}, (table) => [
  // 3. Index on the series column
  index("idx_oil_prices_series").on(table.series),
]);

// 3. Quantized Series Table for Galois Fields
export const quantizedSeries = sqliteTable("quantized_series", {
  id: text("id").primaryKey().notNull(), // UUID or composite date+field
  date: text("date").notNull(),
  rawPrice: numeric("raw_price").notNull(),
  returnPct: numeric("return_pct").notNull(),
  fieldType: text("field_type").notNull(), // 'GF2' | 'GF3' | 'GF256'
  symbol: integer("symbol").notNull(), // 0 or 1 for GF2; 0, 1, 2 for GF3; 0..255 for GF256
  symbolLabel: text("symbol_label"), // 'UP', 'DOWN', 'FLAT', or bucket tag
  paramsJson: text("params_json"), // Stores threshold, window, etc.
  createdAt: text("created_at")
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)
    .notNull(),
}, (table) => [
  index("idx_quantized_field_date").on(table.fieldType, table.date),
]);

// 4. LFSR and Berlekamp-Massey Runs Table
export const lfsrRuns = sqliteTable("lfsr_runs", {
  id: text("id").primaryKey().notNull(),
  createdAt: text("created_at")
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)
    .notNull(),
  fieldType: text("field_type").notNull(),
  windowSize: integer("window_size").notNull(),
  linearComplexity: integer("linear_complexity").notNull(), // L
  polynomialCoeffs: text("polynomial_coeffs").notNull(), // JSON array of connection coefficients
  predictedSymbol: integer("predicted_symbol").notNull(),
  actualSymbol: integer("actual_symbol"),
  isHit: integer("is_hit"), // 1 if match, 0 if missed
  metadataJson: text("metadata_json"),
}, (table) => [
  index("idx_lfsr_field_created").on(table.fieldType, table.createdAt),
]);

