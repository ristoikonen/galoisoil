/* // pipeline.ts
import { createClient } from "@libsql/client";
import OpenAI from "openai";
import { calculateTrueTrend, type PriceRecord } from "./trend-analysis";

// Initialize Turso & OpenAI-compatible Groq clients
const db = createClient({
  url: process.env.TURSO_DATABASE_URL || "file:oil.db",
  authToken: process.env.TURSO_AUTH_TOKEN
});

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://groq.com"
});

interface EIAResponse {
  response: {
    data: Array<{ period: string; value: number; }>;
  };
}

async function fetchEIAPrices(limitDays = 35): Promise<PriceRecord[]> {
  const eiaKey = Bun.env.EIA_API_KEY;
  if (!eiaKey) throw new Error("Missing EIA_API_KEY environment variable.");

  const baseUrl = "https://eia.gov";
  const params = new URLSearchParams({
    api_key: eiaKey,
    "data": "value",
    frequency: "daily",
    "facets[series][]": "RWTC",
    "sort[column]": "period",
    "sort[direction]": "desc",
    length: limitDays.toString()
  });

  const response = await fetch(`${baseUrl}?${params.toString()}`);
  if (!response.ok) throw new Error(`EIA API Error: ${response.status}`);

  const rawJson = (await response.json()) as EIAResponse;
  return (rawJson.response?.data || [])
    .map(row => ({ date: row.period, close: Number(row.value) }))
    .reverse();
}

function filterAnomalies(data: PriceRecord[], windowSize = 5, zThreshold = 2.5): PriceRecord[] {
  const history: number[] = [];
  const cleanRecords: PriceRecord[] = [];

  for (const item of data) {
    if (item.close <= 0 || isNaN(item.close) || item.close === null) continue;
    
    if (history.length < 4) {
      history.push(item.close);
      cleanRecords.push(item);
      continue;
    }

    const n = history.length;
    const mean = history.reduce((sum, v) => sum + v, 0) / n;
    const variance = history.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    const zScore = stdDev === 0 ? 0 : Math.abs(item.close - mean) / stdDev;

    if (zScore > zThreshold) {
      console.warn(`⚠️ Filtered Outlier: ${item.date} @ $${item.close}`);
    } else {
      cleanRecords.push(item);
      history.push(item.close);
      if (history.length > windowSize) history.shift();
    }
  }
  return cleanRecords;
}

async function main() {
  try {
    console.log("🚀 Executing Stage 3 Pipeline...");

    // 1. Ingest and Clean
    const rawData = await fetchEIAPrices(35);
    const cleanData = filterAnomalies(rawData, 10, 2.5);

    // 2. Compute True Quantitative Trend Lines (OLS Linear Regression Core)
    const trend = calculateTrueTrend(cleanData);
    console.log(`📈 Math Computed: ${trend.direction} (R²: ${(trend.rSquared * 100).toFixed(1)}%)`);

    // 3. Compact Context Formatting & Groq Llama 3.1 8B Execution
    const evaluationWindow = cleanData.slice(-7);
    const compactString = evaluationWindow.map(p => `${p.date}: $${p.close.toFixed(2)}`).join("\n");

    console.log("🤖 Requesting market summary from Groq Llama 3.1 8B...");
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant", // Tailored to protect your daily free tokens caps
      temperature: 0.1,
      messages: [
        { 
          role: "system", 
          content: "You are a quantitative commodities trader. Analyse the price history text and provide a single, punchy 2-sentence market outlook overview. Do not return markdown headers." 
        },
        { 
          role: "user", 
          content: `Chronological WTI Crude Sequences:\n${compactString}\n\nProvide context perspective:` 
        }
      ]
    });
    const aiInsight = completion.choices.message.content?.trim() || "";

    // 4. Transactional DB Syncing (Blocks Write Race Conditions completely)
    await db.execute(`CREATE TABLE IF NOT EXISTS oil_prices (date TEXT PRIMARY KEY, price REAL);`);
    await db.execute(`CREATE TABLE IF NOT EXISTS trend_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, calculated_at TEXT DEFAULT CURRENT_TIMESTAMP, slope REAL, r_squared REAL, direction TEXT, next_day_forecast REAL, ai_insight TEXT);`);

    const tx = await db.transaction("write");
    for (const record of cleanData) {
      await tx.execute({
        sql: "INSERT INTO oil_prices VALUES (?, ?) ON CONFLICT(date) DO UPDATE SET price=excluded.price",
        args: [record.date, record.close]
      });
    }

    await tx.execute({
      sql: "INSERT INTO trend_logs (slope, r_squared, direction, next_day_forecast, ai_insight) VALUES (?, ?, ?, ?, ?)",
      args: [trend.slope, trend.rSquared, trend.direction, trend.nextDayForecast, aiInsight]
    });

    await tx.commit();
    console.log("💾 Step 3 complete. Mathematical trend vectors and AI outputs synchronized to Turso.");

  } catch (error) {
    console.error("Stage 3 Failure:", error);
  } finally {
    db.close();
  }
}

main();
 */