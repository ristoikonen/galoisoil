/**
 * Price Quantizer for Galois Field Modeling
 *
 * Converts continuous EIA WTI daily spot prices into discrete algebraic symbols
 * over Galois Fields GF(2), GF(3), and GF(2^8).
 */

import { tursoClient, ensureTablesExist } from "../db/client";

export type GaloisFieldType = "GF2" | "GF3" | "GF256";

export interface RawPricePoint {
  period: string; // "YYYY-MM-DD"
  value: number;  // Price in USD/bbl
}

export interface QuantizedPoint {
  id: string;
  date: string;
  rawPrice: number;
  returnPct: number;
  fieldType: GaloisFieldType;
  symbol: number;
  symbolLabel: string;
  params: Record<string, unknown>;
}

export interface QuantizerOptions {
  deadbandThreshold?: number; // For GF3 (e.g., 0.005 = 0.5% return)
  clipZScore?: number;        // For GF256 volatility scaling (e.g., 3.0)
  field?: GaloisFieldType;
}

export class PriceQuantizer {
  /**
   * Sorts prices chronologically and calculates daily percentage returns.
   */
  public static calculateReturns(data: RawPricePoint[]): Array<{
    date: string;
    rawPrice: number;
    returnPct: number;
  }> {
    // Filter non-positive/null prices and sort ascending by date
    const clean = data
      .filter((d) => d.value > 0 && !isNaN(d.value) && Boolean(d.period))
      .sort((a, b) => new Date(a.period).getTime() - new Date(b.period).getTime());

    const result: Array<{ date: string; rawPrice: number; returnPct: number }> = [];

    for (let i = 1; i < clean.length; i++) {
      const prev = clean[i - 1]!;
      const curr = clean[i]!;
      const returnPct = (curr.value - prev.value) / prev.value;

      result.push({
        date: curr.period,
        rawPrice: curr.value,
        returnPct,
      });
    }

    return result;
  }

  /**
   * Quantizes price movements into GF(2) symbols {0, 1}.
   * 1: UP (return > 0)
   * 0: DOWN (return <= 0)
   */
  public static toGF2(data: RawPricePoint[]): QuantizedPoint[] {
    const returns = this.calculateReturns(data);
    return returns.map((pt) => {
      const isUp = pt.returnPct > 0;
      const symbol = isUp ? 1 : 0;
      return {
        id: `GF2_${pt.date}`,
        date: pt.date,
        rawPrice: pt.rawPrice,
        returnPct: pt.returnPct,
        fieldType: "GF2",
        symbol,
        symbolLabel: isUp ? "UP" : "DOWN",
        params: { rule: "return > 0 ? 1 : 0" },
      };
    });
  }

  /**
   * Quantizes price movements into GF(3) symbols {0, 1, 2}.
   * 0: FLAT / CONSOLIDATION (|return| <= threshold)
   * 1: UP (return > +threshold)
   * 2: DOWN (return < -threshold)
   */
  public static toGF3(
    data: RawPricePoint[],
    deadbandThreshold = 0.005,
  ): QuantizedPoint[] {
    const returns = this.calculateReturns(data);
    return returns.map((pt) => {
      let symbol = 0;
      let label = "FLAT";

      if (pt.returnPct > deadbandThreshold) {
        symbol = 1;
        label = "UP";
      } else if (pt.returnPct < -deadbandThreshold) {
        symbol = 2;
        label = "DOWN";
      }

      return {
        id: `GF3_${pt.date}_t${Math.round(deadbandThreshold * 10000)}`,
        date: pt.date,
        rawPrice: pt.rawPrice,
        returnPct: pt.returnPct,
        fieldType: "GF3",
        symbol,
        symbolLabel: label,
        params: { deadbandThreshold },
      };
    });
  }

  /**
   * Quantizes price movements into GF(2^8) = GF(256) byte symbols [0..255].
   * Maps normalized return distribution:
   * 128 = Zero movement / Neutral
   * 255 = Strong positive surge (+3 sigma)
   * 0   = Severe plunge (-3 sigma)
   */
  public static toGF256(
    data: RawPricePoint[],
    clipZScore = 3.0,
  ): QuantizedPoint[] {
    const returns = this.calculateReturns(data);
    if (returns.length === 0) return [];

    // Calculate mean and standard deviation of returns
    const mean = returns.reduce((acc, r) => acc + r.returnPct, 0) / returns.length;
    const variance =
      returns.reduce((acc, r) => acc + Math.pow(r.returnPct - mean, 2), 0) /
      returns.length;
    const stdDev = Math.sqrt(variance) || 0.01;

    return returns.map((pt) => {
      const zScore = (pt.returnPct - mean) / stdDev;
      // Clamp zScore between -clipZScore and +clipZScore
      const clamped = Math.max(-clipZScore, Math.min(clipZScore, zScore));
      // Normalize to [0, 1] then scale to [0, 255]
      const normalized = (clamped + clipZScore) / (2 * clipZScore);
      const symbol = Math.min(255, Math.max(0, Math.round(normalized * 255)));

      return {
        id: `GF256_${pt.date}`,
        date: pt.date,
        rawPrice: pt.rawPrice,
        returnPct: pt.returnPct,
        fieldType: "GF256",
        symbol,
        symbolLabel: `0x${symbol.toString(16).padStart(2, "0").toUpperCase()}`,
        params: { mean, stdDev, clipZScore },
      };
    });
  }

  /**
   * Universal quantize method based on requested field type.
   */
  public static quantize(
    data: RawPricePoint[],
    options: QuantizerOptions = {},
  ): QuantizedPoint[] {
    const field = options.field ?? "GF2";
    if (field === "GF2") {
      return this.toGF2(data);
    }
    if (field === "GF3") {
      return this.toGF3(data, options.deadbandThreshold ?? 0.005);
    }
    return this.toGF256(data, options.clipZScore ?? 3.0);
  }

  /**
   * Serializes quantized price points to Turso database in atomic batches.
   */
  public static async serializeToTurso(
    points: QuantizedPoint[],
  ): Promise<{ inserted: number; errors?: string }> {
    if (points.length === 0) return { inserted: 0 };

    await ensureTablesExist();

    // Chunk into batches of 100 to avoid SQL statement parameter limits
    const BATCH_SIZE = 100;
    let totalInserted = 0;

    for (let i = 0; i < points.length; i += BATCH_SIZE) {
      const batch = points.slice(i, i + BATCH_SIZE);
      const statements = batch.map((p) => ({
        sql: `
          INSERT INTO quantized_series (
            id, date, raw_price, return_pct, field_type, symbol, symbol_label, params_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            raw_price = excluded.raw_price,
            return_pct = excluded.return_pct,
            symbol = excluded.symbol,
            symbol_label = excluded.symbol_label,
            params_json = excluded.params_json;
        `,
        args: [
          p.id,
          p.date,
          p.rawPrice,
          p.returnPct,
          p.fieldType,
          p.symbol,
          p.symbolLabel,
          JSON.stringify(p.params),
        ],
      }));

      await tursoClient.batch(statements, "write");
      totalInserted += batch.length;
    }

    return { inserted: totalInserted };
  }
}
