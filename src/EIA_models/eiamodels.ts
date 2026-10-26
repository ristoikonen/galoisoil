export interface EiaSeriesDatumOld {
  period: string;
  value: number;
  // EIA v2 also returns these extra fields on each datum:
  // duoarea, area-name, product, product-name, process, process-name,
  // series, series-description, units
}

export interface EiaSeriesDatum {
    period: string;
    value: number;
    duoarea: string;
    'area-name': string;
    product: string;
    'product-name': string;
    process: string;
    'process-name': string;
    series: string;
    'series-description': string;
    units: string;
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
/*
export interface EiaResponse {
  total: number;
  parameters: EiaResponseParameters;
  dateFormat: string;
  frequency: string;
  data: EiaSeriesDatum[];
}

export interface EiaApiResponse {
  response: EiaResponse;
}
*/

export interface EiaApiResponse<T = EiaSeriesDatum> {
  response: {
    total: number;
    dateFormat: string;
    frequency: string;
    data: T[];
  };
}

export interface EiaQueryParams {
  frequency?: 'daily' |'weekly' | 'monthly' | 'annual';
  facets?: Record<string, string[]>;
  data?: string[];
  start?: string;
  end?: string;
  length?: number;
  offset?: number;
  sortColumn?: string;
  sortDirection?: "asc" | "desc";
}
export interface FetchOptions<T = EiaQueryParams> {
  frequency?: string;
  data?: string[];
  offset?: number;
  length?: number;
  sortColumn?: string;
  sortDirection?: "asc" | "desc";
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
