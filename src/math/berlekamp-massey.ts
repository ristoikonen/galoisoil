/**
 * Berlekamp-Massey Algorithm and LFSR Predictor over Finite Fields
 * Supports GF(2), GF(3), and GF(2^8) / GF(256)
 */

import { gfAdd, gfSub, gfMul, gfDiv } from "../services/galois";

export type GaloisFieldType = "GF2" | "GF3" | "GF256";

export interface FiniteField {
  name: GaloisFieldType;
  cardinality: number;
  add(a: number, b: number): number;
  sub(a: number, b: number): number;
  mul(a: number, b: number): number;
  div(a: number, b: number): number;
  inv(a: number): number;
  neg(a: number): number;
}

// 1. GF(2) Implementation: {0, 1}
export const GF2Field: FiniteField = {
  name: "GF2",
  cardinality: 2,
  add: (a, b) => (a ^ b) & 1,
  sub: (a, b) => (a ^ b) & 1,
  mul: (a, b) => (a & b) & 1,
  inv: (a) => {
    if ((a & 1) === 0) throw new Error("Division by zero in GF(2)");
    return 1;
  },
  div: (a, b) => {
    if ((b & 1) === 0) throw new Error("Division by zero in GF(2)");
    return a & 1;
  },
  neg: (a) => a & 1,
};

// 2. GF(3) Implementation: {0, 1, 2}
export const GF3Field: FiniteField = {
  name: "GF3",
  cardinality: 3,
  add: (a, b) => (a + b) % 3,
  sub: (a, b) => (a - b + 3) % 3,
  mul: (a, b) => (a * b) % 3,
  inv: (a) => {
    const mod = ((a % 3) + 3) % 3;
    if (mod === 0) throw new Error("Division by zero in GF(3)");
    return mod; // 1^-1 = 1, 2^-1 = 2 in GF(3)
  },
  div: (a, b) => {
    const invB = GF3Field.inv(b);
    return GF3Field.mul(a, invB);
  },
  neg: (a) => {
    const mod = ((a % 3) + 3) % 3;
    return (3 - mod) % 3;
  },
};

// 3. GF(2^8) Implementation: {0 .. 255}
export const GF256Field: FiniteField = {
  name: "GF256",
  cardinality: 256,
  add: (a, b) => gfAdd(a, b),
  sub: (a, b) => gfSub(a, b),
  mul: (a, b) => gfMul(a, b),
  div: (a, b) => gfDiv(a, b),
  inv: (a) => gfDiv(1, a),
  neg: (a) => a & 0xff, // in char 2, -a = a
};

export function getField(type: GaloisFieldType): FiniteField {
  switch (type) {
    case "GF2":
      return GF2Field;
    case "GF3":
      return GF3Field;
    case "GF256":
      return GF256Field;
    default:
      return GF3Field;
  }
}

export interface BerlekampMasseyResult {
  fieldType: GaloisFieldType;
  sequenceLength: number;
  linearComplexity: number; // L
  connectionPolynomial: number[]; // [c0, c1, ..., cL], c0 = 1
  polynomialString: string;
  linearComplexityProfile: number[]; // L(k) progression
  discrepancies: number[];
}

export interface LFSRPredictionResult {
  fieldType: GaloisFieldType;
  predictedSymbol: number;
  predictedLabel: string;
  linearComplexity: number;
  connectionPolynomial: number[];
  polynomialString: string;
  stabilityIndex: number; // % score of how far L is from random walk N/2
}

export interface BacktestTrial {
  index: number;
  predictedSymbol: number;
  actualSymbol: number;
  isHit: boolean;
  linearComplexity: number;
}

export interface BacktestSummary {
  fieldType: GaloisFieldType;
  totalTrials: number;
  hits: number;
  hitRate: number; // 0.0 - 100.0%
  baselineRate: number; // 50% for GF2, 33.3% for GF3
  trials: BacktestTrial[];
}

export class BerlekampMassey {
  /**
   * Executes the Berlekamp-Massey algorithm on a sequence over a finite field.
   */
  public static solve(
    sequence: number[],
    fieldType: GaloisFieldType = "GF3",
  ): BerlekampMasseyResult {
    const field = getField(fieldType);
    const n = sequence.length;

    let c = [1]; // Connection polynomial C(D)
    let b = [1]; // Correction polynomial B(D)
    let l = 0;   // Current linear complexity L
    let m = -1;  // Position of last update
    let bDiscrepancy = 1;

    const lProfile: number[] = [];
    const discrepancies: number[] = [];

    for (let k = 0; k < n; k++) {
      // 1. Calculate discrepancy d = s_k + sum_{i=1}^L c_i * s_{k-i}
      let d = sequence[k]!;
      for (let i = 1; i <= l; i++) {
        if (i < c.length && k - i >= 0) {
          const term = field.mul(c[i]!, sequence[k - i]!);
          d = field.add(d, term);
        }
      }
      discrepancies.push(d);

      if (d === 0) {
        // Discrepancy is 0; polynomial still holds
        lProfile.push(l);
      } else {
        // Discrepancy != 0; must update polynomial
        const t = [...c]; // copy C
        const factor = field.div(d, bDiscrepancy);
        const shift = k - m;

        // C(D) = C(D) - factor * D^shift * B(D)
        const neededLength = Math.max(c.length, b.length + shift);
        while (c.length < neededLength) c.push(0);

        for (let i = 0; i < b.length; i++) {
          const scaled = field.mul(factor, b[i]!);
          c[i + shift] = field.sub(c[i + shift]!, scaled);
        }

        if (2 * l <= k) {
          l = k + 1 - l;
          m = k;
          b = t;
          bDiscrepancy = d;
        }

        lProfile.push(l);
      }
    }

    // Trim trailing zeroes beyond degree L
    while (c.length > l + 1 && c[c.length - 1] === 0) {
      c.pop();
    }

    // Format algebraic polynomial string
    const polyStr = this.formatPolynomial(c, fieldType);

    return {
      fieldType,
      sequenceLength: n,
      linearComplexity: l,
      connectionPolynomial: c,
      polynomialString: polyStr,
      linearComplexityProfile: lProfile,
      discrepancies,
    };
  }

  /**
   * Formats polynomial coefficients into a readable algebraic string C(D).
   */
  public static formatPolynomial(coeffs: number[], fieldType: GaloisFieldType): string {
    if (coeffs.length === 0) return "1";
    const terms: string[] = ["1"];

    for (let i = 1; i < coeffs.length; i++) {
      const coef = coeffs[i]!;
      if (coef === 0) continue;

      let termStr = "";
      if (fieldType === "GF2") {
        termStr = i === 1 ? "D" : `D^${i}`;
      } else {
        const coefStr = coef === 1 ? "" : `${coef}`;
        termStr = i === 1 ? `${coefStr}D` : `${coefStr}D^${i}`;
      }
      terms.push(termStr);
    }

    const modStr = fieldType === "GF2" ? "(mod 2)" : fieldType === "GF3" ? "(mod 3)" : "(mod GF256)";
    return terms.join(" + ") + ` ${modStr}`;
  }

  /**
   * Predicts the next step symbol s_N using the derived LFSR feedback equation.
   * s_N = - sum_{i=1}^L c_i * s_{N-i}
   */
  public static predictNext(
    sequence: number[],
    fieldType: GaloisFieldType = "GF3",
  ): LFSRPredictionResult {
    const field = getField(fieldType);
    const bm = this.solve(sequence, fieldType);
    const c = bm.connectionPolynomial;
    const l = bm.linearComplexity;
    const n = sequence.length;

    let sum = 0;
    for (let i = 1; i <= l; i++) {
      if (i < c.length && n - i >= 0) {
        const term = field.mul(c[i]!, sequence[n - i]!);
        sum = field.add(sum, term);
      }
    }

    const predictedSymbol = field.neg(sum);

    let label = `${predictedSymbol}`;
    if (fieldType === "GF2") {
      label = predictedSymbol === 1 ? "UP" : "DOWN";
    } else if (fieldType === "GF3") {
      label = predictedSymbol === 1 ? "UP" : predictedSymbol === 2 ? "DOWN" : "FLAT";
    } else {
      label = `0x${predictedSymbol.toString(16).padStart(2, "0").toUpperCase()}`;
    }

    // Stability: How far is L from random walk max (N/2)
    const maxRandomL = Math.max(1, Math.floor(n / 2));
    const stabilityIndex = Math.max(0, Math.min(100, Math.round((1 - l / (maxRandomL * 1.5)) * 100)));

    return {
      fieldType,
      predictedSymbol,
      predictedLabel: label,
      linearComplexity: l,
      connectionPolynomial: c,
      polynomialString: bm.polynomialString,
      stabilityIndex,
    };
  }

  /**
   * Executes a rolling walk-forward backtest over historical symbols.
   */
  public static walkForwardBacktest(
    sequence: number[],
    windowSize = 32,
    fieldType: GaloisFieldType = "GF3",
  ): BacktestSummary {
    const trials: BacktestTrial[] = [];
    let hits = 0;

    for (let t = windowSize; t < sequence.length; t++) {
      const trainWindow = sequence.slice(t - windowSize, t);
      const prediction = this.predictNext(trainWindow, fieldType);
      const actual = sequence[t]!;
      const isHit = prediction.predictedSymbol === actual;

      if (isHit) hits++;

      trials.push({
        index: t,
        predictedSymbol: prediction.predictedSymbol,
        actualSymbol: actual,
        isHit,
        linearComplexity: prediction.linearComplexity,
      });
    }

    const totalTrials = trials.length;
    const hitRate = totalTrials > 0 ? (hits / totalTrials) * 100 : 0;
    const baselineRate = fieldType === "GF2" ? 50.0 : fieldType === "GF3" ? 33.33 : 0.39;

    return {
      fieldType,
      totalTrials,
      hits,
      hitRate: parseFloat(hitRate.toFixed(2)),
      baselineRate,
      trials,
    };
  }
}
