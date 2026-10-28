/**
 * Vercel Serverless Unified API Handler
 * 
 * Enables standalone deployment to Vercel without requiring external Turso database credentials.
 * Operates directly on the packed binary price stores in src/db/bin/.
 */

import { BinaryPriceStore, type PriceRecord, type DecodedSeries } from "../src/db/binary-store";
import { PriceQuantizer, type GaloisFieldType } from "../src/quantizer/price-quantizer";
import { BerlekampMassey } from "../src/math/berlekamp-massey";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

// Series memory cache
const cache = new Map<string, DecodedSeries>();

function getBinaryPath(filename: string): string {
  // Support local workspace or Vercel serverless lambda path
  const candidates = [
    join(process.cwd(), "src", "db", "bin", filename),
    join(__dirname, "..", "src", "db", "bin", filename),
    join(__dirname, "src", "db", "bin", filename),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return candidates[0];
}

function loadSeries(symbol: string, filename: string): DecodedSeries | null {
  if (cache.has(symbol)) return cache.get(symbol)!;
  try {
    const fullPath = getBinaryPath(filename);
    if (!existsSync(fullPath)) return null;
    const buf = readFileSync(fullPath);
    // Convert Node buffer to ArrayBuffer
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    const decoded = BinaryPriceStore.decode(ab);
    cache.set(symbol, decoded);
    return decoded;
  } catch (err) {
    console.warn(`[Vercel Serverless] Failed to load binary for ${symbol}:`, (err as Error).message);
    return null;
  }
}

function getSeriesRecords(symbol = "RWTC", length?: number): { symbol: string; data: PriceRecord[]; source: string } {
  const sym = symbol.toUpperCase();
  const fileMap: Record<string, string> = {
    RWTC: "wti_daily.bin",
    RBRTE: "brent.bin",
    RNGC1: "henry_hub.bin",
    RNGWHHD: "henry_hub.bin",
  };

  const filename = fileMap[sym] || "wti_daily.bin";
  const decoded = loadSeries(sym, filename) || loadSeries("RWTC", "wti_daily.bin");

  if (decoded && decoded.data.length > 0) {
    const data = length && length > 0 && length < decoded.data.length
      ? decoded.data.slice(-length)
      : decoded.data;
    return { symbol: decoded.symbol, data, source: "binary_store" };
  }
  return { symbol: sym, data: [], source: "none" };
}

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method.toUpperCase();

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // 1. /api/wti or /api/series
    if (path.endsWith("/api/wti") || path.endsWith("/api/series")) {
      const lengthParam = url.searchParams.get("length");
      const seriesParam = (url.searchParams.get("series") || "RWTC").toUpperCase();
      const length = lengthParam === "all" ? 0 : (lengthParam ? Number(lengthParam) : 100);

      const local = getSeriesRecords(seriesParam, length);
      return Response.json(
        {
          series: local.symbol,
          count: local.data.length,
          data: local.data,
          source: local.source,
        },
        { headers: corsHeaders }
      );
    }

    // 2. /api/series/list
    if (path.endsWith("/api/series/list")) {
      const symbols = [
        { sym: "RWTC", file: "wti_daily.bin", name: "WTI Crude Oil", units: "$/BBL" },
        { sym: "RBRTE", file: "brent.bin", name: "Brent Crude Oil", units: "$/BBL" },
        { sym: "RNGC1", file: "henry_hub.bin", name: "Henry Hub Natural Gas", units: "$/MMBTU" },
      ];

      const commodities = symbols.map(s => {
        const decoded = loadSeries(s.sym, s.file);
        if (!decoded) return null;
        return {
          symbol: s.sym,
          name: s.name,
          units: s.units,
          count: decoded.count,
          earliest: decoded.data[0]?.period,
          latest: decoded.data[decoded.data.length - 1]?.period,
        };
      }).filter(Boolean);

      return Response.json(
        {
          mode: "standalone_binary",
          commodities,
        },
        { headers: corsHeaders }
      );
    }

    // 3. /api/quantize
    if (path.endsWith("/api/quantize") && method === "POST") {
      const body = (await req.json()) as {
        field?: GaloisFieldType;
        deadbandThreshold?: number;
        clipZScore?: number;
        data?: Array<{ period: string; value: number }>;
      };

      let rawData = body.data;
      if (!rawData || rawData.length === 0) {
        rawData = getSeriesRecords("RWTC", 64).data;
      }

      const quantized = PriceQuantizer.quantize(rawData, {
        field: body.field ?? "GF3",
        deadbandThreshold: body.deadbandThreshold ?? 0.005,
        clipZScore: body.clipZScore ?? 3.0,
      });

      return Response.json(
        {
          success: true,
          field: body.field ?? "GF3",
          count: quantized.length,
          data: quantized,
        },
        { headers: corsHeaders }
      );
    }

    // 4. /api/quantize/serialize
    if (path.endsWith("/api/quantize/serialize") && method === "POST") {
      const body = (await req.json()) as {
        field?: GaloisFieldType;
        deadbandThreshold?: number;
        clipZScore?: number;
        data?: Array<{ period: string; value: number }>;
      };

      let rawData = body.data;
      if (!rawData || rawData.length === 0) {
        rawData = getSeriesRecords("RWTC", 64).data;
      }

      const quantized = PriceQuantizer.quantize(rawData, {
        field: body.field ?? "GF3",
        deadbandThreshold: body.deadbandThreshold ?? 0.005,
        clipZScore: body.clipZScore ?? 3.0,
      });

      const result = await PriceQuantizer.serializeToTurso(quantized);

      return Response.json(
        {
          success: true,
          inserted: result.inserted,
          mode: "standalone_binary",
          field: body.field ?? "GF3",
          count: quantized.length,
          data: quantized.slice(-10),
        },
        { headers: corsHeaders }
      );
    }

    // 5. /api/lfsr/predict
    if (path.endsWith("/api/lfsr/predict") && method === "POST") {
      const body = (await req.json()) as {
        field?: GaloisFieldType;
        deadbandThreshold?: number;
        windowSize?: number;
        data?: Array<{ period: string; value: number }>;
      };

      let rawData = body.data;
      if (!rawData || rawData.length === 0) {
        rawData = getSeriesRecords("RWTC", 120).data;
      }

      const field = body.field ?? "GF3";
      const deadband = body.deadbandThreshold ?? 0.005;
      const windowSize = body.windowSize ?? 32;

      const quantized = PriceQuantizer.quantize(rawData, {
        field,
        deadbandThreshold: deadband,
      });

      const symbols = quantized.map(q => q.symbol);
      const prediction = BerlekampMassey.predictNext(symbols.slice(-windowSize), field);
      const backtest = BerlekampMassey.walkForwardBacktest(symbols, windowSize, field);

      return Response.json(
        {
          success: true,
          field,
          windowSize,
          totalPoints: quantized.length,
          prediction,
          backtest,
        },
        { headers: corsHeaders }
      );
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
  } catch (err) {
    return Response.json(
      { error: (err as Error).message },
      { status: 500, headers: corsHeaders }
    );
  }
}
