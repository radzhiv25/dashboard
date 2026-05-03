"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  isAnalyzeError,
  type AnalyzeProduct,
  type AnalyzeResponse,
  type AnalyzeSuccess,
} from "@/types";

const LOADING_STEPS = [
  "Fetching Best Sellers HTML",
  "Parsing product grid & prices",
  "Estimating units from BSR curve",
  "Computing revenue & market share",
] as const;

function formatUsd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

export default function Home() {
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "ORBIS";
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeSuccess | null>(null);

  useEffect(() => {
    if (!loading) return;
    const id = window.setInterval(() => {
      setActiveStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1));
    }, 650);
    return () => window.clearInterval(id);
  }, [loading]);

  const analyze = useCallback(async () => {
    setError(null);
    setResult(null);
    setActiveStep(0);
    setLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data: unknown = await res.json();
      const typed = data as AnalyzeResponse;
      if (!res.ok && isAnalyzeError(typed)) {
        setError(typed.error);
        return;
      }
      if (isAnalyzeError(typed)) {
        setError(typed.error);
        return;
      }
      setResult(typed);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }, [url]);

  const topShare = result?.products[0]?.marketShare ?? 0;
  const avgPrice = useMemo(() => {
    if (!result?.products.length) return 0;
    const sum = result.products.reduce((a, p) => a + p.price, 0);
    return sum / result.products.length;
  }, [result]);

  const maxBar = useMemo(() => {
    if (!result?.products.length) return 1;
    return Math.max(
      ...result.products.map((p) => p.estimatedMonthlyRevenue),
      1
    );
  }, [result]);

  return (
    <div className="min-h-screen bg-[#050608]">
      <div className="mx-auto flex max-w-5xl flex-col gap-12 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        {/* Header */}
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-sans text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              {appName}
              <span className="text-zinc-500"> / </span>
              <span className="text-base font-normal text-zinc-400 sm:text-lg">
                market intelligence
              </span>
            </p>
          </div>
          <div className="font-mono text-xs uppercase tracking-widest text-zinc-500">
            <span
              className="mr-2 inline-block h-2 w-2 rounded-full bg-[#63cab7] shadow-[0_0_12px_#63cab7]"
              aria-hidden
            />
            live estimations
          </div>
        </header>

        {/* Hero */}
        <section>
          <h1 className="max-w-3xl font-sans text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
            Know the exact size of any Amazon market
          </h1>
          <p className="mt-4 max-w-2xl font-mono text-sm text-zinc-500">
            Paste a Best Sellers URL. ORBIS extracts the top ASINs, maps rank to
            sales using a published BSR curve, and rolls up category revenue.
          </p>
        </section>

        {/* Input */}
        <section
          className="rounded-xl border-[0.5px] border-white/[0.12] bg-white/[0.03] p-4 sm:p-6"
          style={{ borderWidth: "0.5px" }}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <label className="sr-only" htmlFor="amazon-url">
              Amazon Best Sellers URL
            </label>
            <input
              id="amazon-url"
              type="url"
              placeholder="https://www.amazon.com/gp/bestsellers/hpc/"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="font-mono flex-1 rounded-lg border-[0.5px] border-white/[0.12] bg-[#0a0c10] px-4 py-3 text-sm text-zinc-100 outline-none ring-[#63cab7]/40 placeholder:text-zinc-600 focus:border-[#63cab7]/50 focus:ring-2"
              disabled={loading}
            />
            <button
              type="button"
              onClick={analyze}
              disabled={loading || !url.trim()}
              className="rounded-lg bg-[#63cab7] px-6 py-3 font-sans text-sm font-semibold text-[#050608] transition hover:bg-[#52b8a6] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Analyze
            </button>
          </div>
        </section>

        {/* Loading */}
        {loading && (
          <section
            className="rounded-xl border-[0.5px] border-white/[0.12] bg-white/[0.03] p-6 sm:p-8"
            style={{ borderWidth: "0.5px" }}
            aria-live="polite"
          >
            <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">
              Working
            </p>
            <ul className="mt-4 space-y-3">
              {LOADING_STEPS.map((label, i) => (
                <li
                  key={label}
                  className={`flex items-center gap-3 font-mono text-sm transition-colors duration-300 ${
                    i <= activeStep
                      ? "text-[#63cab7]"
                      : "text-zinc-600"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                      i <= activeStep
                        ? "border-[#63cab7] bg-[#63cab7]/10 text-[#63cab7]"
                        : "border-zinc-700 text-zinc-600"
                    }`}
                  >
                    {i + 1}
                  </span>
                  {label}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Error */}
        {error && !loading && (
          <div
            role="alert"
            className="rounded-xl border-[0.5px] border-red-500/30 bg-red-500/5 px-4 py-3 font-mono text-sm text-red-300"
            style={{ borderWidth: "0.5px" }}
          >
            {error}
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <div className="flex flex-col gap-10">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">
                Category
              </p>
              <h2 className="mt-1 font-sans text-2xl font-semibold text-white">
                {result.category}
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard
                label="Total market revenue (est.)"
                value={formatUsd(result.totalMarketRevenue)}
              />
              <StatCard
                label="#1 market share"
                value={formatPct(topShare)}
              />
              <StatCard label="Avg. price" value={formatUsd(avgPrice)} />
            </div>

            <section
              className="overflow-hidden rounded-xl border-[0.5px] border-white/[0.12] bg-white/[0.02]"
              style={{ borderWidth: "0.5px" }}
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.08] font-mono text-xs uppercase tracking-wider text-zinc-500">
                      <th className="px-4 py-3">Rank</th>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3">BSR</th>
                      <th className="px-4 py-3">Est. monthly revenue</th>
                      <th className="px-4 py-3">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.products.map((p: AnalyzeProduct) => (
                      <tr
                        key={`${p.rank}-${p.url}`}
                        className="border-b border-white/[0.06] last:border-0"
                      >
                        <td className="font-mono px-4 py-3 text-zinc-400">
                          {p.rank}
                        </td>
                        <td className="max-w-[280px] px-4 py-3">
                          <a
                            href={p.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-sans text-zinc-100 underline decoration-zinc-700 underline-offset-4 hover:decoration-[#63cab7]"
                          >
                            {p.name}
                          </a>
                        </td>
                        <td className="font-mono px-4 py-3 text-zinc-400">
                          {p.bsr}
                        </td>
                        <td className="font-mono px-4 py-3 text-[#63cab7]">
                          {formatUsd(p.estimatedMonthlyRevenue)}
                        </td>
                        <td className="font-mono px-4 py-3 text-zinc-300">
                          {formatPct(p.marketShare)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">
                Revenue mix (est.)
              </p>
              <div
                className="mt-4 space-y-2 rounded-xl border-[0.5px] border-white/[0.12] bg-white/[0.02] p-4 sm:p-6"
                style={{ borderWidth: "0.5px" }}
              >
                {result.products.map((p: AnalyzeProduct) => {
                  const widthPct =
                    (p.estimatedMonthlyRevenue / maxBar) * 100;
                  return (
                    <div key={`bar-${p.rank}`} className="flex flex-col gap-1">
                      <div className="flex justify-between gap-2 font-mono text-xs text-zinc-400">
                        <span className="truncate">{p.name}</span>
                        <span className="shrink-0 text-[#63cab7]">
                          {formatUsd(p.estimatedMonthlyRevenue)}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className="h-full rounded-full bg-[#63cab7]/80 transition-all"
                          style={{
                            width: `${Math.max(widthPct, 2)}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <footer
              className="rounded-xl border-[0.5px] border-dashed border-white/[0.15] bg-transparent px-4 py-4 font-mono text-xs leading-relaxed text-zinc-500 sm:px-6"
              style={{ borderWidth: "0.5px" }}
            >
              <strong className="text-zinc-400">Methodology.</strong> Revenue is
              inferred from list position (BSR proxy) via a simplified Jungle
              Scout–style curve, multiplied by observed list price. Amazon does
              not publish sales; figures are indicative only and vary by
              seasonality, coupons, and category-specific demand.
            </footer>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-xl border-[0.5px] border-white/[0.12] bg-white/[0.03] px-4 py-5 sm:px-5"
      style={{ borderWidth: "0.5px" }}
    >
      <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">
        {label}
      </p>
      <p className="mt-2 font-sans text-xl font-semibold text-white sm:text-2xl">
        {value}
      </p>
    </div>
  );
}
