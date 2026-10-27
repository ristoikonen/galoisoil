// // mock-pipeline.ts
// import { createClient } from "@libsql/client";
// import { calculateTrueTrend, type PriceRecord } from "./trend-analysis";

// // Initialize to use your local SQLite database binary file
// const db = createClient({
//   url: process.env.TURSO_DATABASE_URL || "file:oil.db"
// });

//   //Deliberately injects a technical anomaly and a flash crash to test your filter!

// function generateMockEIAPrices(): PriceRecord[] {
//   console.log("⚡ Generating offline mock data rows for WTI Cushing series...");
  
//   const basePrice = 75.50;
//   const records: PriceRecord[] = [];
//   const totalDays = 35;
  
//   // Set start date back 35 days from today
//   const startDate = new Date();
//   startDate.setDate(startDate.getDate() - totalDays);

//   for (let i = 0; i < totalDays; i++) {
//     const currentDay = new Date(startDate);
//     currentDay.setDate(startDate.getDate() + i);
//     const dateString = currentDay.toISOString().split("T")[0];

//     // Create a steady, predictable upward trend line with small random variations
//     let closePrice = basePrice + (i * 0.15) + (Math.sin(i) * 0.40);

//     // Injected Anomaly Test Point A (Day 15): Technical failure / Zero data corruption
//     if (i === 15) {
//       closePrice = 0.00; 
//     }
    
//     // Injected Anomaly Test Point B (Day 25): Extreme fat-finger data spike
//     if (i === 25) {
//       closePrice = 185.50; 
//     }

//     records.push({ date: dateString, close: Number(closePrice.toFixed(2)) });
//   }

//   return records;
// }

// /**
//  * 2. Sliding-window rolling Z-Score filter engine (Same logic as production pipeline)
//  */
// function filterAnomalies(data: PriceRecord[], windowSize = 5, zThreshold = 2.5): PriceRecord[] {
//   const history: number[] = [];
//   const cleanRecords: PriceRecord[] = [];

//   for (const item of data) {
//     // Technical Guardrail check
//     if (item.close <= 0 || isNaN(item.close) || item.close === null) {
//       console.warn(` [GUARDRAIL CHECK] Technical Anomaly Intercepted & Dropped: ${item.date} was $${item.close}`);
//       continue;
//     }

//     // Warm-up configuration
//     if (history.length < 4) {
//       history.push(item.close);
//       cleanRecords.push(item);
//       continue;
//     }

//     const n = history.length;
//     const mean = history.reduce((sum, v) => sum + v, 0) / n;
//     const variance = history.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
//     const stdDev = Math.sqrt(variance);
//     const zScore = stdDev === 0 ? 0 : Math.abs(item.close - mean) / stdDev;

//     if (zScore > zThreshold) {
//       console.warn(`❌ [Z-SCORE CHECK] Statistical Outlier Blocked: ${item.date} @ $${item.close} (Z-Score: ${zScore.toFixed(2)})`);
//     } else {
//       cleanRecords.push(item);
//       history.push(item.close);
//       if (history.length > windowSize) history.shift();
//     }
//   }
//   return cleanRecords;
// }

// /**
//  * 3. Primary Orchestrator Loop (100% Offline Simulation Mode)
//  */
// async function main() {
//   try {
//     console.log("=== Running Offline Ingestion & Math Diagnostics ===");

//     // Step A: Load mock data stream
//     const rawData = generateMockEIAPrices();

//     // Step B: Route rows through your data filtering guardrails
//     const cleanData = filterAnomalies(rawData, 10, 2.5);
//     console.log(`\n Total Input Rows: ${rawData.length} | Clean Verified Rows Passed: ${cleanData.length}`);

//     // Step C: Execute OLS linear regression using your imported core engine module
//     const trend = calculateTrueTrend(cleanData);
//     console.log(`\n📈 Mathematical OLS Vector Analysis Complete:`);
//     console.log(`   -> Market Direction Baseline : ${trend.direction}`);
//     console.log(`   -> Calculated Trend Slope     : ${trend.slope.toFixed(4)} USD shift/day`);
//     console.log(`   -> Curve Fit Accuracy (R²)     : ${(trend.rSquared * 100).toFixed(1)}%`);
//     console.log(`   -> Next-Day Extrapolated Close: $${trend.nextDayForecast.toFixed(2)}`);

//     // Step D: Mock the Groq LLM text output block completely offline
//     const mockAiInsight = `[OFFLINE MODE MOCK INSIGHT] Market displays a steady ${trend.direction.toLowerCase()} momentum trajectory. The mathematical regression model indicates high confidence with an R-squared value of ${(trend.rSquared * 100).toFixed(0)}%. Accumulation remains optimal above baseline values.`;

//     // Step E: Create schema tables and write out results transactionally to your local file database
//     await db.execute(`CREATE TABLE IF NOT EXISTS oil_prices (date TEXT PRIMARY KEY, price REAL);`);
//     await db.execute(`CREATE TABLE IF NOT EXISTS trend_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, calculated_at TEXT DEFAULT CURRENT_TIMESTAMP, slope REAL, r_squared REAL, direction TEXT, next_day_forecast REAL, ai_insight TEXT);`);

//     console.log("\n💾 Initiating isolated SQLite transactional database sync...");
//     const tx = await db.transaction("write");
    
//     for (const record of cleanData) {
//       await tx.execute({
//         sql: "INSERT INTO oil_prices VALUES (?, ?) ON CONFLICT(date) DO UPDATE SET price=excluded.price",
//         args: [record.date, record.close]
//       });
//     }

//     await tx.execute({
//       sql: "INSERT INTO trend_logs (slope, r_squared, direction, next_day_forecast, ai_insight) VALUES (?, ?, ?, ?, ?)",
//       args: [trend.slope, trend.rSquared, trend.direction, trend.nextDayForecast, mockAiInsight]
//     });

//     await tx.commit();
//     console.log("🚀 Offline diagnostic run completely successfully! Local 'oil.db' file updated.");

//   } catch (error) {
//     console.error("Pipeline diagnostic crash:", error);
//   } finally {
//     db.close();
//   }
// }

// main();
