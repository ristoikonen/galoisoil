/**
 * Vercel Serverless & Bun Unified API Handler
 * 
 * Powered natively by Bun's zero-copy File API (Bun.file().arrayBuffer()).
 * Enables standalone deployment to Vercel without requiring external database credentials.
 * Operates directly on the packed binary price stores in src/db/bin/.
 */

import { BinaryPriceStore, type PriceRecord, type DecodedSeries } from "../src/db/binary-store";
import { PriceQuantizer, type GaloisFieldType } from "../src/quantizer/price-quantizer";
import { BerlekampMassey } from "../src/math/berlekamp-massey";

// Series memory cache
const cache = new Map<string, DecodedSeries>();

async function getBinaryBuffer(filename: string): Promise<ArrayBuffer | null> {
  const cwdNormalized = process.cwd().replace(/\\/g, "/");
  const cwdBase = cwdNormalized.endsWith("/") ? cwdNormalized : `${cwdNormalized}/`;
  const candidates: URL[] = [
    new URL(`../src/db/bin/${filename}`, import.meta.url),
    new URL(`./src/db/bin/${filename}`, import.meta.url),
    new URL(`src/db/bin/${filename}`, `file:///${cwdBase}`),
  ];

  for (const c of candidates) {
    if (typeof Bun !== "undefined") {
      const file = Bun.file(c);
      if (await file.exists()) {
        return await file.arrayBuffer();
      }
    } else {
      // Node.js fallback when deployed to standard Vercel serverless environment
      try {
        const { promises: fs } = await import("fs");
        const buf = await fs.readFile(c);
        return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
      } catch {
        // Try next candidate
      }
    }
  }
  return null;
}

async function loadSeries(symbol: string, filename: string): Promise<DecodedSeries | null> {
  if (cache.has(symbol)) return cache.get(symbol)!;
  try {
    const ab = await getBinaryBuffer(filename);
    if (!ab) return null;
    const decoded = BinaryPriceStore.decode(ab);
    cache.set(symbol, decoded);
    return decoded;
  } catch (err) {
    console.warn(`[BinaryStore] Failed to load binary for ${symbol}:`, (err as Error).message);
    return null;
  }
}

async function getSeriesRecords(symbol = "RWTC", length?: number): Promise<{ symbol: string; data: PriceRecord[]; source: string }> {
  const sym = symbol.toUpperCase();
  const fileMap: Record<string, string> = {
    RWTC: "wti_daily.bin",
    RBRTE: "brent.bin",
    RNGC1: "henry_hub.bin",
    RNGWHHD: "henry_hub.bin",
  };

  const filename = fileMap[sym] || "wti_daily.bin";
  const decoded = (await loadSeries(sym, filename)) || (await loadSeries("RWTC", "wti_daily.bin"));

  if (decoded && decoded.data.length > 0) {
    const data = length && length > 0 && length < decoded.data.length
      ? decoded.data.slice(-length)
      : decoded.data;
    return { symbol: decoded.symbol, data, source: "binary_store" };
  }
  return { symbol: sym, data: [], source: "none" };
}

export default async function handler(req: any, res?: any): Promise<Response | void> {
  // Safe URL parsing supporting both Web standard Request and Node IncomingMessage
  const rawUrl = typeof req.url === "string" ? req.url : req.url?.href || "/";
  const url = new URL(rawUrl, "http://localhost");
  const path = url.pathname;
  const method = (req.method || "GET").toUpperCase();

  const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // Helper to send response whether in Vercel Node (res) or Bun (Response)
  const sendJson = (status: number, data: any) => {
    if (res && typeof res.status === "function") {
      for (const [k, v] of Object.entries(corsHeaders)) {
        res.setHeader(k, v);
      }
      return res.status(status).json(data);
    }
    return Response.json(data, { status, headers: corsHeaders });
  };

  if (method === "OPTIONS") {
    if (res && typeof res.status === "function") {
      for (const [k, v] of Object.entries(corsHeaders)) {
        res.setHeader(k, v);
      }
      return res.status(204).end();
    }
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // 1. /api/wti or /api/series
    if (path.endsWith("/api/wti") || path.endsWith("/api/series")) {
      const lengthParam = url.searchParams.get("length");
      const seriesParam = (url.searchParams.get("series") || "RWTC").toUpperCase();
      const length = lengthParam === "all" ? 0 : (lengthParam ? Number(lengthParam) : 100);

      const local = await getSeriesRecords(seriesParam, length);
      return sendJson(200, {
        series: local.symbol,
        count: local.data.length,
        data: local.data,
        source: local.source,
      });
    }

    // 2. /api/series/list
    if (path.endsWith("/api/series/list")) {
      const symbols = [
        { sym: "RWTC", file: "wti_daily.bin", name: "WTI Crude Oil", units: "$/BBL" },
        { sym: "RBRTE", file: "brent.bin", name: "Brent Crude Oil", units: "$/BBL" },
        { sym: "RNGC1", file: "henry_hub.bin", name: "Henry Hub Natural Gas", units: "$/MMBTU" },
      ];

      const commodities = (await Promise.all(
        symbols.map(async s => {
          const decoded = await loadSeries(s.sym, s.file);
          if (!decoded) return null;
          return {
            symbol: s.sym,
            name: s.name,
            units: s.units,
            count: decoded.count,
            earliest: decoded.data[0]?.period,
            latest: decoded.data[decoded.data.length - 1]?.period,
          };
        })
      )).filter(Boolean);

      const isTursoConfigured = Boolean(
        process.env.TURSO_DATABASE_URL &&
        !process.env.TURSO_DATABASE_URL.startsWith("file:") &&
        process.env.TURSO_AUTH_TOKEN
      );

      return sendJson(200, {
        mode: isTursoConfigured ? "cloud_hybrid" : "standalone_binary",
        isTursoConfigured,
        commodities,
      });
    }

    // 3. /api/quantize
    if (path.endsWith("/api/quantize") && method === "POST") {
      const body = (typeof req.json === "function" ? await req.json() : req.body) as {
        field?: GaloisFieldType;
        deadbandThreshold?: number;
        clipZScore?: number;
        data?: Array<{ period: string; value: number }>;
      };

      let rawData = body?.data;
      if (!rawData || rawData.length === 0) {
        rawData = (await getSeriesRecords("RWTC", 64)).data;
      }

      const quantized = PriceQuantizer.quantize(rawData, {
        field: body?.field ?? "GF3",
        deadbandThreshold: body?.deadbandThreshold ?? 0.005,
        clipZScore: body?.clipZScore ?? 3.0,
      });

      return sendJson(200, {
        success: true,
        field: body?.field ?? "GF3",
        count: quantized.length,
        data: quantized,
      });
    }

    // 4. /api/quantize/serialize
    if (path.endsWith("/api/quantize/serialize") && method === "POST") {
      const body = (typeof req.json === "function" ? await req.json() : req.body) as {
        field?: GaloisFieldType;
        deadbandThreshold?: number;
        clipZScore?: number;
        data?: Array<{ period: string; value: number }>;
      };

      let rawData = body?.data;
      if (!rawData || rawData.length === 0) {
        rawData = (await getSeriesRecords("RWTC", 64)).data;
      }

      const quantized = PriceQuantizer.quantize(rawData, {
        field: body?.field ?? "GF3",
        deadbandThreshold: body?.deadbandThreshold ?? 0.005,
        clipZScore: body?.clipZScore ?? 3.0,
      });

      const result = await PriceQuantizer.serializeToTurso(quantized);

      return sendJson(200, {
        success: true,
        inserted: result.inserted,
        mode: "standalone_binary",
        field: body?.field ?? "GF3",
        count: quantized.length,
        data: quantized.slice(-10),
      });
    }

    // 5. /api/lfsr/predict
    if (path.endsWith("/api/lfsr/predict") && method === "POST") {
      const body = (typeof req.json === "function" ? await req.json() : req.body) as {
        field?: GaloisFieldType;
        deadbandThreshold?: number;
        windowSize?: number;
        data?: Array<{ period: string; value: number }>;
      };

      let rawData = body?.data;
      if (!rawData || rawData.length === 0) {
        rawData = (await getSeriesRecords("RWTC", 120)).data;
      }

      const field = body?.field ?? "GF3";
      const deadband = body?.deadbandThreshold ?? 0.005;
      const windowSize = body?.windowSize ?? 32;

      const quantized = PriceQuantizer.quantize(rawData, {
        field,
        deadbandThreshold: deadband,
      });

      const symbols = quantized.map(q => q.symbol);
      const prediction = BerlekampMassey.predictNext(symbols.slice(-windowSize), field);
      const backtest = BerlekampMassey.walkForwardBacktest(symbols, windowSize, field);

      return sendJson(200, {
        success: true,
        field,
        windowSize,
        totalPoints: quantized.length,
        prediction,
        backtest,
      });
    }

    if (res && typeof res.status === "function") {
      return res.status(404).send("Not Found");
    }
    return new Response("Not Found", { status: 404, headers: corsHeaders });
  } catch (err) {
    return sendJson(500, { error: (err as Error).message });
  }
}
