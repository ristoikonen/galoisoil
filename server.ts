import { EiaService } from "./src/eia.service";
//import { type EiaSeriesDatum, FetchSeriesOptions, EiaResponseParameters, EiaApiResponse, EiaApiError, FetchWtiDailyOptions,  } from "./src/EIA_models/eiamodels";
const port = Number(Bun.env.APP_PORT ?? 3000);
const host = Bun.env.APP_HOST ?? "localhost";
const eia = new EiaService(); // reads Bun.env.EIA_API_KEY

const server = Bun.serve({
    port,
    routes: {
        "/api/wti": {
            GET: async (req: Request) => {
                try {
                    const url = new URL(req.url);
                    const length = url.searchParams.get("length");
                    const prices = await eia.fetchWtiDaily({
                        length: length ? Number(length) : 5000,
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
        "/": {
            GET: async (_req: Request) => {
                return new Response("hi", { status: 200 });
            },
        },
    },
});

console.log(`Bun server listening on http://localhost:${port}`);
