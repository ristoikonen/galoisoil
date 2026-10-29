import { EiaService } from "./src/eia.service";
import planPageText from "./public/plan.html" with { type: "text" };
import sparseGlowText from "./public/sparse-glow.html" with { type: "text" };
import { PriceQuantizer, type GaloisFieldType } from "./src/quantizer/price-quantizer";
import { ensureTablesExist, isTursoConfigured } from "./src/db/client";
import { BerlekampMassey } from "./src/math/berlekamp-massey";
import { BinaryPriceStore, type PriceRecord, type DecodedSeries } from "./src/db/binary-store";
import { renderDocsPageHtml } from "./src/docs/DocsPage";

export interface GaloisSettings {
    readonly mode: "read_only";
}

const galoisSettings: GaloisSettings = {
    mode: "read_only",
};

const port = Number(Bun.env.APP_PORT ?? 3000);
const host = Bun.env.APP_HOST ?? "localhost";
const eia = new EiaService(); // reads Bun.env.EIA_API_KEY

// In-Memory Binary Store Cache for instantaneous standalone serving
const seriesCache = new Map<string, DecodedSeries>();

async function initBinaryStore() {
    const files: Record<string, string> = {
        RWTC: "src/db/bin/wti_daily.bin",
        RBRTE: "src/db/bin/brent.bin",
        RNGC1: "src/db/bin/henry_hub.bin",
        RNGWHHD: "src/db/bin/henry_hub.bin",
    };

    for (const [sym, path] of Object.entries(files)) {
        try {
            const decoded = await BinaryPriceStore.loadFromFile(path);
            seriesCache.set(sym, decoded);
        } catch {
            // File optional on initial setup
        }
    }
    console.log(`[BinaryStore] Initialized ${seriesCache.size} commodity series from src/db/bin/`);
}

await initBinaryStore();

// Verify Turso schema tables on boot if configured
if (isTursoConfigured) {
    ensureTablesExist()
        .then(() => console.log("Turso database schema verified."))
        .catch((err) => console.warn("Notice: Turso schema check:", err.message));
} else {
    console.log("[Storage] Running in Standalone Binary Mode (zero external database connection required).");
}

function getLocalSeries(symbol = "RWTC", length?: number): { symbol: string; data: PriceRecord[]; source: string } {
    const sym = symbol.toUpperCase();
    const cached = seriesCache.get(sym) || seriesCache.get("RWTC");
    if (cached && cached.data.length > 0) {
        const data = length && length > 0 && length < cached.data.length
            ? cached.data.slice(-length)
            : cached.data;
        return { symbol: cached.symbol, data, source: "binary_store" };
    }
    return { symbol: sym, data: [], source: "none" };
}

const server = Bun.serve({
    port,
    routes: {
        "/": {
            GET: async () => {
                return new Response(String(sparseGlowText), {
                    headers: { "Content-Type": "text/html" },
                });
            },
        },

        "/sparse": {
            GET: async () => {
                return new Response(String(sparseGlowText), {
                    headers: { "Content-Type": "text/html" },
                });
            },
        },

        "/plan": {
            GET: async () => {
                return new Response(String(planPageText), {
                    headers: { "Content-Type": "text/html" },
                });
            },
        },

        "/docs": {
            GET: async () => {
                return new Response(renderDocsPageHtml(), {
                    headers: { "Content-Type": "text/html; charset=utf-8" },
                });
            },
        },

        "/api/settings": {
            GET: async () => {
                return Response.json(galoisSettings);
            },
        },

        "/api/wti": {
            GET: async (req: Request) => {
                try {
                    const url = new URL(req.url);
                    const lengthParam = url.searchParams.get("length");
                    const seriesParam = (url.searchParams.get("series") || "RWTC").toUpperCase();

                    const length = lengthParam === "all" ? 0 : (lengthParam ? Number(lengthParam) : 100);
                    const local = getLocalSeries(seriesParam, length);

                    // 1. Serve immediately from high-performance binary store (< 0.2ms)
                    if (local.data.length > 0) {
                        return Response.json({
                            series: local.symbol,
                            count: local.data.length,
                            data: local.data,
                            source: "binary_store",
                        });
                    }

                    // 2. Fallback to live EIA if binary file missing
                    const prices = await eia.fetchWtiDaily({
                        length: length || 100,
                    });

                    return Response.json({
                        series: "RWTC",
                        count: prices.length,
                        data: prices,
                        source: "eia_live",
                    });
                } catch (err) {
                    return Response.json(
                        { error: err instanceof Error ? err.message : String(err) },
                        { status: 500 },
                    );
                }
            },
        },

        "/api/series/list": {
            GET: async () => {
                const uniqueSymbols = ["RWTC", "RBRTE", "RNGC1"];
                const commodities = uniqueSymbols
                    .map((sym) => {
                        const val = seriesCache.get(sym);
                        if (!val) return null;
                        return {
                            symbol: sym,
                            name: sym === "RWTC" ? "WTI Crude Oil" : sym === "RBRTE" ? "Brent Crude Oil" : "Henry Hub Natural Gas",
                            units: sym === "RNGC1" ? "$/MMBTU" : "$/BBL",
                            count: val.count,
                            earliest: val.data[0]?.period,
                            latest: val.data[val.data.length - 1]?.period,
                        };
                    })
                    .filter(Boolean);

                return Response.json({
                    mode: isTursoConfigured ? "cloud_hybrid" : "standalone_binary",
                    isTursoConfigured,
                    commodities,
                });
            },
        },

        "/api/quantize": {
            POST: async (req: Request) => {
                try {
                    const body = (await req.json()) as {
                        field?: GaloisFieldType;
                        deadbandThreshold?: number;
                        clipZScore?: number;
                        data?: Array<{ period: string; value: number }>;
                    };

                    let rawData = body.data;
                    if (!rawData || rawData.length === 0) {
                        const local = getLocalSeries("RWTC", 64);
                        rawData = local.data.length > 0 ? local.data : await eia.fetchWtiDaily({ length: 64 });
                    }

                    const quantized = PriceQuantizer.quantize(rawData, {
                        field: body.field ?? "GF3",
                        deadbandThreshold: body.deadbandThreshold ?? 0.005,
                        clipZScore: body.clipZScore ?? 3.0,
                    });

                    return Response.json({
                        success: true,
                        field: body.field ?? "GF3",
                        count: quantized.length,
                        data: quantized,
                    });
                } catch (err) {
                    return Response.json(
                        { error: err instanceof Error ? err.message : String(err) },
                        { status: 500 },
                    );
                }
            },
        },

        "/api/quantize/serialize": {
            POST: async (req: Request) => {
                try {
                    const body = (await req.json()) as {
                        field?: GaloisFieldType;
                        deadbandThreshold?: number;
                        clipZScore?: number;
                        data?: Array<{ period: string; value: number }>;
                    };

                    let rawData = body.data;
                    if (!rawData || rawData.length === 0) {
                        const local = getLocalSeries("RWTC", 64);
                        rawData = local.data.length > 0 ? local.data : await eia.fetchWtiDaily({ length: 64 });
                    }

                    const quantized = PriceQuantizer.quantize(rawData, {
                        field: body.field ?? "GF3",
                        deadbandThreshold: body.deadbandThreshold ?? 0.005,
                        clipZScore: body.clipZScore ?? 3.0,
                    });

                    const result = await PriceQuantizer.serializeToTurso(quantized);

                    return Response.json({
                        success: true,
                        inserted: result.inserted,
                        field: body.field ?? "GF3",
                        count: quantized.length,
                        data: quantized.slice(-10), // return last 10 points for inspection
                    });
                } catch (err) {
                    return Response.json(
                        { error: err instanceof Error ? err.message : String(err) },
                        { status: 500 },
                    );
                }
            },
        },

        "/api/lfsr/predict": {
            POST: async (req: Request) => {
                try {
                    const body = (await req.json()) as {
                        field?: GaloisFieldType;
                        deadbandThreshold?: number;
                        windowSize?: number;
                        data?: Array<{ period: string; value: number }>;
                    };

                    let rawData = body.data;
                    if (!rawData || rawData.length === 0) {
                        const local = getLocalSeries("RWTC", 120);
                        rawData = local.data.length > 0 ? local.data : await eia.fetchWtiDaily({ length: 120 });
                    }

                    const field = body.field ?? "GF3";
                    const deadband = body.deadbandThreshold ?? 0.005;
                    const windowSize = body.windowSize ?? 32;

                    const quantized = PriceQuantizer.quantize(rawData, {
                        field,
                        deadbandThreshold: deadband,
                    });

                    const symbols = quantized.map((q) => q.symbol);
                    const prediction = BerlekampMassey.predictNext(symbols.slice(-windowSize), field);
                    const backtest = BerlekampMassey.walkForwardBacktest(symbols, windowSize, field);

                    return Response.json({
                        success: true,
                        field,
                        windowSize,
                        totalPoints: quantized.length,
                        prediction,
                        backtest,
                    });
                } catch (err) {
                    return Response.json(
                        { error: err instanceof Error ? err.message : String(err) },
                        { status: 500 },
                    );
                }
            },
        },
    },
});

console.log(`Bun server listening on http://${host}:${port}`);
