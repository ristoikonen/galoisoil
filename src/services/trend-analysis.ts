
// trend-analysis.ts
export interface PriceRecord { date: string; close: number; }
export interface QuantitativeTrend { slope: number; intercept: number; rSquared: number; direction: "UPWARD" | "DOWNWARD" | "FLAT"; nextDayForecast: number; }

export function calculateTrueTrend(records: PriceRecord[]): QuantitativeTrend {
  const n = records.length;
  if (n < 2) throw new Error("At least 2 records are required.");
  const xValues = Array.from({ length: n }, (_, i) => i);
  const yValues = records.map(r => r.close);
  let sX = 0, sY = 0, sXY = 0, sXX = 0, sYY = 0;
  for (let i = 0; i < n; i++) {
    const x = xValues[i]; const y = yValues[i];
    sX += x; sY += y; sXY += x * y; sXX += x * x; sYY += y * y;
  }
  const slope = (n * sXY - sX * sY) / (n * sXX - sX * sX);
  const intercept = (sY - slope * sX) / n;
  const meanY = sY / n;
  let totSS = 0, resSS = 0;
  for (let i = 0; i < n; i++) {
    totSS += Math.pow(yValues[i] - meanY, 2);
    resSS += Math.pow(yValues[i] - (slope * xValues[i] + intercept), 2);
  }
  const rSquared = totSS === 0 ? 0 : 1 - (resSS / totSS);
  const direction = slope > 0.05 ? "UPWARD" : slope < -0.05 ? "DOWNWARD" : "FLAT";
  return { slope, intercept, rSquared, direction, nextDayForecast: (slope * n) + intercept };
}

