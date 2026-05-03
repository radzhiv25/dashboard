export interface AnalyzeProduct {
  rank: number;
  name: string;
  price: number;
  bsr: number;
  estimatedMonthlySales: number;
  estimatedMonthlyRevenue: number;
  marketShare: number;
  url: string;
}

export interface AnalyzeSuccess {
  category: string;
  totalMarketRevenue: number;
  products: AnalyzeProduct[];
}

export interface AnalyzeErrorBody {
  error: string;
}

export type AnalyzeResponse = AnalyzeSuccess | AnalyzeErrorBody;

export function isAnalyzeError(
  res: AnalyzeResponse
): res is AnalyzeErrorBody {
  return "error" in res && typeof res.error === "string";
}

export interface ScrapedProductRow {
  name: string;
  price: number | null;
  url: string;
}
