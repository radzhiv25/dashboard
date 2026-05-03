import axios from "axios";
import { NextResponse } from "next/server";
import { estimateRevenue } from "@/lib/bsr";
import { extractCategoryFromHtml, scrapeBestsellers } from "@/lib/scraper";
import type {
  AnalyzeProduct,
  AnalyzeResponse,
  AnalyzeSuccess,
  ScrapedProductRow,
} from "@/types";

function extractCategory(urlString: string): string {
  try {
    const u = new URL(urlString);
    const parts = u.pathname.split("/").filter(Boolean);
    const idx = parts.indexOf("bestsellers");
    const slug =
      idx >= 0 && parts[idx + 1] ? parts[idx + 1] : parts[parts.length - 1];
    if (!slug) return "Amazon Best Sellers";
    return slug
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  } catch {
    return "Amazon Best Sellers";
  }
}

function buildProducts(rows: ScrapedProductRow[]): AnalyzeSuccess | null {
  if (rows.length === 0) return null;

  const numericPrices = rows
    .map((r) => r.price)
    .filter((p): p is number => p !== null && !Number.isNaN(p));
  const avgPrice =
    numericPrices.length > 0
      ? numericPrices.reduce((a, b) => a + b, 0) / numericPrices.length
      : 0;

  const base: Omit<AnalyzeProduct, "marketShare">[] = rows.map((row, index) => {
    const rank = index + 1;
    const price =
      row.price !== null && !Number.isNaN(row.price)
        ? row.price
        : avgPrice > 0
          ? avgPrice
          : 0;
    const { units, revenue } = estimateRevenue(rank, price);
    return {
      rank,
      name: row.name,
      price,
      bsr: rank,
      estimatedMonthlySales: units,
      estimatedMonthlyRevenue: revenue,
      url: row.url,
    };
  });

  const totalMarketRevenue = base.reduce(
    (sum, p) => sum + p.estimatedMonthlyRevenue,
    0
  );

  const products: AnalyzeProduct[] = base.map((p) => ({
    ...p,
    marketShare:
      totalMarketRevenue > 0
        ? (p.estimatedMonthlyRevenue / totalMarketRevenue) * 100
        : 0,
  }));

  return {
    category: "",
    totalMarketRevenue,
    products,
  };
}

export async function POST(
  request: Request
): Promise<NextResponse<AnalyzeResponse>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const url =
    typeof body === "object" &&
    body !== null &&
    "url" in body &&
    typeof (body as { url: unknown }).url === "string"
      ? (body as { url: string }).url.trim()
      : "";

  if (
    !url.toLowerCase().includes("amazon") ||
    !url.toLowerCase().includes("bestsellers")
  ) {
    return NextResponse.json(
      {
        error:
          "Invalid URL. Use an Amazon Best Sellers link (must include amazon and bestsellers).",
      },
      { status: 400 }
    );
  }

  const normalized = url.startsWith("http") ? url : `https://${url}`;

  try {
    const response = await axios.get<string>(normalized, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        // Do not send Accept-Encoding explicitly: Amazon returns a smaller /
        // alternate markup variant when gzip is declared that breaks our selectors.
        // Axios still transparently decompresses gzip/br responses from Amazon.
      },
      responseType: "text",
      timeout: 30000,
      validateStatus: (status) => status < 600,
    });

    if (response.status === 503 || response.status === 429) {
      return NextResponse.json(
        { error: "Amazon rate limited. Try again in 30 seconds." },
        { status: 429 }
      );
    }

    if (response.status !== 200 || typeof response.data !== "string") {
      return NextResponse.json(
        { error: "Could not fetch page. Try another URL or try again later." },
        { status: 502 }
      );
    }

    const scraped = scrapeBestsellers(response.data);
    const built = buildProducts(scraped);

    if (!built || built.products.length === 0) {
      return NextResponse.json(
        { error: "Could not parse page. URL may be unsupported." },
        { status: 422 }
      );
    }

    const fromPage = extractCategoryFromHtml(response.data);
    const payload: AnalyzeSuccess = {
      ...built,
      category: fromPage ?? extractCategory(normalized),
    };

    return NextResponse.json(payload);
  } catch {
    return NextResponse.json(
      { error: "Request failed. Check the URL and try again." },
      { status: 500 }
    );
  }
}
