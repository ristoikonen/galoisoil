import { EiaService } from "./src/eia.service";
import planPageText from "./public/plan.html" with { type: "text" };
import sparseGlowText from "./public/sparse-glow.html" with { type: "text" };
import { PriceQuantizer, type GaloisFieldType } from "./src/quantizer/price-quantizer";
import { ensureTablesExist } from "./src/db/client";

const port = Number(Bun.env.APP_PORT ?? 3000);
const host = Bun.env.APP_HOST ?? "localhost";
const eia = new EiaService(); // reads Bun.env.EIA_API_KEY

// Verify Turso schema tables on boot
ensureTablesExist()
    .then(() => console.log("Turso database schema verified."))
    .catch((err) => console.warn("Notice: Turso schema check (offline or connecting):", err.message));

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

        "/api/wti": {
            GET: async (req: Request) => {
                try {
                    const url = new URL(req.url);
                    const length = url.searchParams.get("length");
                    const prices = await eia.fetchWtiDaily({
                        length: length ? Number(length) : 100,
                    });

                    return Response.json({
                        series: "RWTC",
                        count: prices.length,
                        data: prices,
                    });
                } catch (err) {
                    return Response.json(
                        { error: err instanceof Error ? err.message : String(err) },
                        { status: 500 },
                    );
                }
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
                        rawData = await eia.fetchWtiDaily({ length: 64 });
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
                        rawData = await eia.fetchWtiDaily({ length: 64 });
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
    },
});

console.log(`Bun server listening on http://${host}:${port}`);
