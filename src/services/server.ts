// server.ts
//import { createClient } from "@libsql/client";

// Initialize your Turso client to read from your local SQLite binary file
//const db = createClient({
//  url: Bun.env.TURSO_DATABASE_URL || "file:oil.db"
//});

//console.log("🌐 BunOliPipeline Dashboard booting up on http://localhost:3000 ...");



      //const latestPriceQuery = await db.execute("SELECT * FROM oil_prices ORDER BY date DESC LIMIT 1;");
      //const latestTrendQuery = await db.execute("SELECT * FROM trend_logs ORDER BY calculated_at DESC LIMIT 1;");
/*      
      const latestPriceQuery = [];
      const latestTrendQuery = [];
      

      const priceRow = latestPriceQuery.rows[0];
      const trendRow = latestTrendQuery.rows[0];



      const htmlOutput = `
        <!DOCTYPE html>
        <html lang="en-AU">
        <head>
            <meta charset="UTF-8">
            <title>BunOliPipeline Analytics</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #121214; color: #e1e1e6; padding: 40px; margin: 0; }
                .card { background: #202024; padding: 32px; border-radius: 12px; max-width: 550px; margin: 40px auto; box-shadow: 0 8px 24px rgba(0,0,0,0.4); border: 1px solid #2f2f33; }
                h1 { color: #00b4d8; margin: 0 0 4px 0; font-size: 1.8rem; letter-spacing: -0.5px; }
                .timestamp { font-size: 0.8rem; color: #7c7c8a; margin-bottom: 24px; }
                .price-container { font-size: 3rem; font-weight: 800; color: #ffffff; margin: 20px 0; letter-spacing: -1px; }
                .unit { font-size: 1.2rem; color: #7c7c8a; font-weight: 400; }
                hr { border: 0; border-top: 1px solid #2f2f33; margin: 24px 0; }
                .metric-row { margin: 12px 0; font-size: 1rem; line-height: 1.5; }
                .label { color: #7c7c8a; }
                .value { font-weight: 600; color: #fff; }
                .badge { background: #2a2a30; padding: 4px 8px; border-radius: 4px; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.5px; }
                .UPWARD { color: #43d375; } .DOWNWARD { color: #f75a68; } .FLAT { color: #e1e1e6; }
                p.insight { background: #121214; padding: 16px; border-radius: 6px; font-size: 0.95rem; color: #04d9ff; line-height: 1.5; border-left: 4px solid #00b4d8; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="card">
                <h1>BunOliPipeline Dashboard</h1>
                <div class="timestamp">Calculated (UTC): ${trendRow.calculated_at}</div>
                
                <div class="price-container">
                    $${Number(priceRow.price).toFixed(2)} <span class="unit">USD/bbl</span>
                </div>
                
                <hr>
                
                <div class="metric-row">
                    <span class="label">Market Vector direction:</span> 
                    <span class="value badge ${trendRow.direction}">${trendRow.direction}</span>
                </div>
                <div class="metric-row">
                    <span class="label">Mathematical Trajectory (Slope):</span> 
                    <span class="value">${Number(trendRow.slope).toFixed(4)} value shift/day</span>
                </div>
                <div class="metric-row">
                    <span class="label">Ordinary Least Squares Fit (R²):</span> 
                    <span class="value">${(Number(trendRow.r_squared) * 100).toFixed(1)}%</span>
                </div>
                <div class="metric-row">
                    <span class="label">OLS Next-Day Predicted Close:</span> 
                    <span class="value" style="color: #00b4d8;">$${Number(trendRow.next_day_forecast).toFixed(2)}</span>
                </div>
                
                <hr>
                
                <span class="label" style="font-size: 0.9rem; font-weight: 600;">LLM Qualitative Insight Profile:</span>
                <p class="insight">${trendRow.ai_insight}</p>
            </div>
        </body>
        </html>
      `;
*/