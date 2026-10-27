import { sqliteTable, text, numeric, index } from "drizzle-orm/sqlite-core";
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
