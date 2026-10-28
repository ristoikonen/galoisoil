# Sovereign Bond Yields Packed Binary Store (`PBIN`)

Lightweight, high-performance binary time series for 10-Year Benchmark Sovereign Bond Yields across 7 key economies:
- **US** (`US_10Y`): United States 10Y Treasury (Source: Federal Reserve FRED `DGS10`)
- **Japan** (`JP_10Y`): Japan 10Y Government Bond (Source: Ministry of Finance Japan `jgbcme_all.csv`)
- **Germany / Europe** (`DE_10Y`): Germany 10Y Bund (Source: Deutsche Bundesbank `BBSIS`)
- **Australia** (`AU_10Y`): Australia 10Y Commonwealth Gov Bond (Source: Reserve Bank of Australia Table F2)
- **United Kingdom** (`UK_10Y`): UK 10Y Gilt (Source: OECD / Bank of England via FRED `IRLTLT01GBM156N`)
- **New Zealand** (`NZ_10Y`): New Zealand 10Y Gov Bond (Source: OECD / RBNZ via FRED `IRLTLT01NZM156N`)
- **China** (`CN_10Y`): China Sovereign Benchmark Yield (Source: OECD / National Bureau of Statistics via FRED `IR3TTS01CNM156N`)

## Binary Layout (`PBIN` v1)

| Offset | Length | Type | Description |
|---|---|---|---|
| `0..3` | 4 bytes | ASCII | Magic identifier (`PBIN`) |
| `4..11` | 8 bytes | ASCII | Symbol identifier null-padded (e.g. `US_10Y\0\0`) |
| `12..13` | 2 bytes | Uint16 | Format version (`1`) |
| `14..15` | 2 bytes | Uint16 | Scale multiplier (`1000` for 0.1 basis point precision) |
| `16..19` | 4 bytes | Uint32 | Total record count ($N$) |
| `20..23` | 4 bytes | Int32 | Base day (Days since Unix epoch 1970-01-01) |
| `24..27` | 4 bytes | Int32 | Base yield in integer units (`yield * 1000`) |
| `28..31` | 4 bytes | Uint32 | Reserved (0) |
| `32..32+2N` | $2N$ bytes | Int16[] | Daily day deltas (`curDay - prevDay`) |
| `32+2N..32+4N` | $2N$ bytes | Int16[] | Daily yield deltas in scaled units (`curYield - prevYield`) |

Total size: $32 + 4N$ bytes. For $N = 5,000$ points, file size is exactly **20,032 bytes (~19.6 KB)**.

## Instant TypeScript Unpacker

```ts
import { decodeBondPBIN } from "./unpacker";

const buffer = await Bun.file("us_10y.bin").arrayBuffer();
const { symbol, count, data } = decodeBondPBIN(buffer);

console.log(`Loaded ${count} records for ${symbol}`);
console.log(`Latest yield: ${data[count - 1].period} = ${data[count - 1].yieldPct}%`);
```
Decompresses in **< 0.15 ms** directly into typed arrays.
