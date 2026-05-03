import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import type { ScrapedProductRow } from "@/types";

function parsePrice(text: string): number | null {
  const compact = text.replace(/\s+/g, " ").trim();
  const dollar = compact.match(/\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/);
  if (dollar) {
    const n = Number.parseFloat(dollar[1].replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  const plain = compact.match(
    /\b(\d{1,3}(?:,\d{3})+\.\d{2})\b|\b(\d+\.\d{2})\b/
  );
  if (plain) {
    const raw = plain[1] ?? plain[2];
    const n = Number.parseFloat(raw.replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function extractCategoryFromHtml(html: string): string | null {
  const $ = cheerio.load(html);
  const fromNav = $("#zg-left-col .zg-selected a, #zg-left-col .zg-selected span")
    .first()
    .text()
    .trim();
  if (fromNav) return fromNav;
  const title = $("title").first().text().trim();
  const best = title.match(/Best\s+Sellers:\s*Best\s+(.+)/i);
  if (best?.[1]) return best[1].trim();
  const m = title.match(
    /Best\s+Sellers?:\s*(.+?)(?:\s*[-—:]\s*Amazon|\s*\|\s*Amazon)/i
  );
  if (m?.[1]) return m[1].trim();
  const m2 = title.match(/Amazon\.com[\s:]*(.+?)\s*Best\s+Sellers/i);
  return m2?.[1]?.trim() ?? null;
}

function normalizeAmazonHref(href: string): string {
  if (!href) return "";
  if (href.startsWith("http")) return href;
  if (href.startsWith("//")) return `https:${href}`;
  return `https://www.amazon.com${href.startsWith("/") ? href : `/${href}`}`;
}

function extractAsin(href: string): string | null {
  const m = href.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
  return m?.[1] ?? null;
}

function rowFromContainer(
  $: cheerio.CheerioAPI,
  root: AnyNode
): ScrapedProductRow | null {
  const $root = $(root);
  const name =
    $root
      .find(
        ".p13n-sc-truncate-desktop-type2, .p13n-sc-truncated, [class*='p13n-sc-css-line-clamp'], [class*='p13n-sc-line-clamp']"
      )
      .first()
      .text()
      .trim() ||
    $root.find('img[alt]').first().attr("alt")?.trim() ||
    "";

  const priceText = $root
    .find("[class*='p13n-sc-price'], .p13n-sc-price")
    .first()
    .text();
  const price = parsePrice(priceText);

  const link = $root
    .find('a[href*="/dp/"], a[href*="/gp/product/"]')
    .filter((_i, el) => {
      const h = $(el).attr("href") ?? "";
      return extractAsin(h) !== null;
    })
    .first();
  const rawHref = link.attr("href") ?? "";
  const url = normalizeAmazonHref(rawHref);

  if (!name || !url) return null;
  return { name, price, url };
}

export function scrapeBestsellers(html: string): ScrapedProductRow[] {
  const $ = cheerio.load(html);
  const results: ScrapedProductRow[] = [];
  const seen = new Set<string>();

  const orderedSelectors = [
    "#zg-ordered-list > li",
    "ol#zg-ordered-list > li",
    '[id="zg-ordered-list"] > li',
    ".zg-grid-general-faceout",
  ];

  for (const sel of orderedSelectors) {
    $(sel).each((_i, el) => {
      if (results.length >= 10) return false;
      const row = rowFromContainer($, el);
      if (!row) return;
      const asin = extractAsin(row.url);
      const key = asin ?? row.url;
      if (seen.has(key)) return;
      seen.add(key);
      results.push(row);
      return undefined;
    });
    if (results.length >= 10) break;
  }

  if (results.length > 0) {
    return results.slice(0, 10);
  }

  $(
    ".p13n-sc-truncate-desktop-type2, .p13n-sc-truncated, [class*='p13n-sc-css-line-clamp']"
  ).each((_i, el) => {
    if (results.length >= 10) return false;
    const $el = $(el);
    const card =
      $el.closest("li").get(0) ??
      $el.closest('[role="listitem"]').get(0) ??
      $el.closest(".zg-grid-general-faceout").get(0) ??
      $el.parent().parent().get(0);
    if (!card) return;
    const row = rowFromContainer($, card);
    if (!row) return;
    const asin = extractAsin(row.url);
    const key = asin ?? row.url;
    if (seen.has(key)) return;
    seen.add(key);
    results.push(row);
    return undefined;
  });

  return results.slice(0, 10);
}
