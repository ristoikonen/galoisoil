/**
 * EIA (U.S. Energy Information Administration) API v2 service.
 *
 * Reads the API key from the EIA_API_KEY environment variable via Bun.env.
 * Uses Bun's built-in fetch (no extra dependencies required).
 *
 * Example:
 *   const eia = new EiaService();
 *   const prices = await eia.fetchWtiDaily();
 *   console.log(prices[0]); // { period: "2024-01-01", value: 75.5 }
 */
// EiaResponseParameters,EiaResponse,EiaApiResponseX
import { type EiaSeriesDatum, FetchSeriesOptions, 
    EiaApiResponse, EiaApiError, FetchWtiDailyOptions,EiaQueryParams
    } from "./EIA_models/eiamodels";

const EIA_BASE_URL = "https://api.eia.gov/v2/petroleum/pri/spt/data/";
/* 
export interface EiaSeriesDatum {
  period: string;
  value: number;
  // EIA v2 also returns these extra fields on each datum:
  // duoarea, area-name, product, product-name, process, process-name,
  // series, series-description, units
} 

export interface EiaSort {
  column: string;
  direction: string;
}

export interface EiaResponseParameters {
  frequency: string;
  data: string[];
  facets: Record<string, string[]>;
  start: string;
  end: string;
  sort: EiaSort[];
  offset: number;
  length: number;
}

export interface EiaResponse {
  total: number;
  parameters: EiaResponseParameters;
  data: EiaSeriesDatum[];
}

export interface EiaApiResponse {
  response: EiaResponse;
}

export class EiaApiError extends Error {
  public readonly status?: number;
  public readonly body?: string;

  constructor(message: string, status?: number, body?: string) {
    super(message);
    this.name = "EiaApiError";
    this.status = status;
    this.body = body;
  }
}

export interface FetchWtiDailyOptions {
  offset?: number;
  length?: number;
}

export interface FetchSeriesOptions {
  frequency?: string;
  data?: string[];
  offset?: number;
  length?: number;
  sortColumn?: string;
  sortDirection?: "asc" | "desc";
}
*/
/**
 * Service for querying the EIA v2 petroleum/pri/spt endpoint.
 * Default series is RWTC (WTI crude oil spot price, daily).
 */
export class EiaService {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(options: { apiKey?: string; baseUrl?: string } = {}) {
    this.apiKey = options.apiKey ?? Bun.env.EIA_API_KEY ?? "";

    if (!this.apiKey) {
      throw new EiaApiError(
        "Missing EIA_API_KEY. Set the EIA_API_KEY environment variable or pass apiKey to the constructor.",
      );
    }

    this.baseUrl = options.baseUrl ?? EIA_BASE_URL;
  }

  /**
   * Fetch WTI (RWTC) daily spot price series from the EIA API.
   *
   * Query:
   *   https://api.eia.gov/v2/petroleum/pri/spt/data/
   *   ?api_key=...
   *   &frequency=daily
   *   &data[0]=value
   *   &facets[series][]=RWTC
   *   &sort[0][column]=period
   *   &sort[0][direction]=desc
   *   &offset=0
   *   &length=5000
   */
  async fetchWtiDaily(options: FetchWtiDailyOptions = {}): Promise<EiaSeriesDatum[]> {
    return this.fetchSeriesData("RWTC", {
      frequency: "daily",
      data: ["value"],
      offset: options.offset ?? 0,
      length: options.length ?? 5000,
    },
  {
      frequency: "daily",
      data: ["value"],
      offset: options.offset ?? 0,
      length: options.length ?? 5000,
    }
  );
  }

  /**
   * Generic fetch for any series on the petroleum/pri/spt endpoint.
   */
  async fetchSeriesData(
    series: string,
    options: FetchSeriesOptions = {},
    params: EiaQueryParams = {}
  ): Promise<EiaSeriesDatum[]> {
    const {
      frequency = "daily",
      data = ["value"],
      offset = 0,
      length = 5000,
      sortColumn = "period",
      sortDirection = "desc",
    } = options;

    const url = new URL(this.baseUrl);

    // Authentication
    url.searchParams.set("api_key", this.apiKey);

    if (params.frequency) url.searchParams.set('frequency', params.frequency);
    if (params.start) url.searchParams.set('start', params.start);
    if (params.end) url.searchParams.set('end', params.end);
    if (params.data && params.data.length > 0) {
        data.forEach((d, i) => {
          url.searchParams.set(`data[${i}]`, d);
        });
    }

    if (params.length) url.searchParams.set('length', params.length.toString());
    if (params.offset) url.searchParams.set('offset', params.offset.toString());
    // Serialize EIA nested facets (e.g. facets[duoarea][]=NUS)
    if (params.facets) {
      for (const [key, values] of Object.entries(params.facets)) {
        values.forEach((val) => {
          url.searchParams.append(`facets[${key}][]`, val);
        });
      }
    }

    // Frequency
    url.searchParams.set("frequency", frequency);

    // data[] array params
    data.forEach((d, i) => {
      url.searchParams.set(`data[${i}]`, d);
    });

    // Series facet (EIA v2 facet syntax: facets[series][]=RWTC)
    url.searchParams.set("facets[series][]", series);

    // Sorting
    url.searchParams.set(`sort[0][column]`, sortColumn);
    url.searchParams.set(`sort[0][direction]`, sortDirection);

    // Pagination
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("length", String(length));

    const requestUrl = url.toString();
    //debugger;
    let response: Response;
    try {
      response = await fetch(requestUrl);
      //debugger;
      //console.log(result ? result.response : 'nores');
    } catch (err) {
      throw new EiaApiError(
        `Network error while fetching EIA series "${series}": ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }

    if (!response.ok) {
      let body = "";
      try {
        body = await response.text();
      } catch {
        // ignore body read errors
      }
      throw new EiaApiError(
        `EIA API returned ${response.status} ${response.statusText} for series "${series}".`,
        response.status,
        body,
      );
    }

    let json: EiaApiResponse<EiaSeriesDatum>;
    try {
      json = (await response.json());
    } catch (err) {
      throw new EiaApiError(
        `Failed to parse EIA API JSON response for series "${series}": ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }

    if (!json.response || !Array.isArray(json.response.data)) {
      throw new EiaApiError(
        `Unexpected EIA API response shape for series "${series}".`,
        response.status,
        JSON.stringify(json),
      );
    }

    return json.response.data.map((d) => ({
      ...d,
      value: Number(String(d.value ?? "").replace(/,/g, "")),
    }));
  }
}
