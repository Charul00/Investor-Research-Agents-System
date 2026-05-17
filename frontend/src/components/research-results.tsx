"use client";

import { FileText, Newspaper, Sparkles, TrendingUp } from "lucide-react";
import { useState } from "react";

import { PaginationControls } from "@/components/pagination-controls";
import { CompanyMetric, PricePoint, ResearchResponse, SourceReference } from "@/lib/api";

type ResearchResultsProps = {
  result: ResearchResponse;
  onSave: () => void;
  isSaving: boolean;
};

const NEWS_PAGE_SIZE = 4;
const DOCUMENT_PAGE_SIZE = 4;
const SOURCE_PAGE_SIZE = 6;

function sourceLabel(source?: SourceReference) {
  if (!source) {
    return "Source available";
  }
  return `${source.provider}: ${source.title}`;
}

function formatLargeNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function sentimentTone(sentiment: string) {
  if (sentiment === "positive") {
    return "border-[#b7dfca] bg-[#ecf8f1] text-[#167047]";
  }
  if (sentiment === "negative") {
    return "border-[#f4b8ad] bg-[#fff1ef] text-[#9a3412]";
  }
  return "border-[#d7dce5] bg-[#f5f7fb] text-[#475467]";
}

function confidenceLabel(value: number) {
  return `${Math.round(value * 100)}% confidence`;
}

export function MiniPriceChart({ points }: { points: PricePoint[] }) {
  if (points.length === 0) {
    return <div className="text-xs text-[var(--muted)]">No history available</div>;
  }

  const values = points.map((point) => point.close);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = max - min || 1;

  return (
    <div className="flex h-16 items-end gap-1" aria-label="Eight day price trend">
      {points.map((point) => {
        const height = 28 + ((point.close - min) / spread) * 52;
        return (
          <span
            key={`${point.date}-${point.close}`}
            title={`${point.date}: $${point.close}`}
            className="w-full rounded-t-md bg-[var(--accent)]/75"
            style={{ height: `${height}%` }}
          />
        );
      })}
    </div>
  );
}

function CompanyCard({
  company,
  source,
}: {
  company: CompanyMetric;
  source?: SourceReference;
}) {
  return (
    <article className="premium-card rounded-[1.35rem] p-4 transition">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="rounded-full bg-[#1f1a17] px-3 py-1 text-xs font-semibold text-[#efe5d6]">
            {company.symbol}
          </span>
          <h3 className="mt-3 text-lg font-semibold text-[var(--foreground)]">
            {company.company_name}
          </h3>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold text-[var(--foreground)]">
            ${company.price.toFixed(2)}
          </p>
          <p
            className={
              company.change_percent >= 0
                ? "text-sm font-semibold text-[var(--accent-strong)]"
                : "text-sm font-semibold text-[var(--danger)]"
            }
          >
            {company.change_percent >= 0 ? "+" : ""}
            {company.change_percent.toFixed(2)}%
          </p>
        </div>
      </div>

      <div className="mt-4">
        <MiniPriceChart points={company.historical_prices} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-[var(--muted)]">Volume</dt>
          <dd className="font-semibold text-[var(--foreground)]">
            {formatLargeNumber(company.volume)}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--muted)]">Market cap</dt>
          <dd className="font-semibold text-[var(--foreground)]">{company.market_cap}</dd>
        </div>
        <div>
          <dt className="text-[var(--muted)]">P/E</dt>
          <dd className="font-semibold text-[var(--foreground)]">
            {company.pe_ratio ?? "N/A"}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--muted)]">Revenue</dt>
          <dd className="font-semibold text-[var(--foreground)]">{company.revenue ?? "N/A"}</dd>
        </div>
      </dl>

      <p className="mt-4 text-xs leading-5 text-[var(--muted)]">
        Source: {sourceLabel(source)}
      </p>
    </article>
  );
}

export function ResearchResults({ result, onSave, isSaving }: ResearchResultsProps) {
  const [newsPage, setNewsPage] = useState(1);
  const [documentPage, setDocumentPage] = useState(1);
  const [sourcePage, setSourcePage] = useState(1);
  const sourceById = new Map(result.sources.map((source) => [source.id, source]));
  const visibleNews = result.news.slice(
    (newsPage - 1) * NEWS_PAGE_SIZE,
    newsPage * NEWS_PAGE_SIZE,
  );
  const visibleDocuments = result.documents.slice(
    (documentPage - 1) * DOCUMENT_PAGE_SIZE,
    documentPage * DOCUMENT_PAGE_SIZE,
  );
  const visibleSources = result.sources.slice(
    (sourcePage - 1) * SOURCE_PAGE_SIZE,
    sourcePage * SOURCE_PAGE_SIZE,
  );

  return (
    <div className="mt-6 space-y-5">
      <section className="premium-card rounded-[1.5rem] p-5 transition">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="eyebrow mb-2">AI Research Result</p>
            <h3 className="text-2xl font-semibold text-[var(--foreground)]">
              Structured analysis ready
            </h3>
            <p className="mt-3 max-w-4xl leading-7 text-[var(--ink-soft)]">
              {result.executive_summary}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-[#e8f2ee] px-3 py-1 font-semibold text-[var(--accent-strong)]">
              {result.latency_ms}ms
            </span>
            <span className="rounded-full bg-[#f4ead7] px-3 py-1 font-semibold text-[#7c5a1f]">
              {result.sources.length} sources
            </span>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {result.plan.tools.map((tool) => (
            <span
              key={tool}
              className="rounded-full border border-[var(--border)] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]"
            >
              {tool.replace(/_/g, " ")}
            </span>
          ))}
        </div>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{result.plan.rationale}</p>
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="btn-secondary mt-5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FileText size={16} aria-hidden="true" />
          {isSaving ? "Saving..." : "Save this as report"}
        </button>
      </section>

      {result.companies.length > 0 ? (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp size={18} aria-hidden="true" className="text-[var(--accent)]" />
            <h3 className="text-xl font-semibold text-[var(--foreground)]">Market snapshot</h3>
          </div>
          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {result.companies.map((company) => (
              <CompanyCard
                key={company.symbol}
                company={company}
                source={sourceById.get(company.source_id)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {result.insights.length > 0 ? (
        <section className="grid gap-4 lg:grid-cols-3">
          {result.insights.map((insight) => (
            <article
              key={`${insight.section}-${insight.title}`}
              className="premium-card rounded-[1.35rem] p-4 transition"
            >
              <p className="eyebrow mb-2">{insight.section}</p>
              <h3 className="text-lg font-semibold text-[var(--foreground)]">{insight.title}</h3>
              <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">{insight.body}</p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--accent-strong)]">
                {confidenceLabel(insight.confidence)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {insight.source_ids.map((sourceId) => (
                  <span
                    key={sourceId}
                    title={sourceLabel(sourceById.get(sourceId))}
                    className="rounded-full bg-[#f5f7fb] px-2 py-1 text-[0.7rem] text-[var(--muted)]"
                  >
                    {sourceId}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {result.news.length > 0 ? (
        <section className="premium-card rounded-[1.5rem] p-5 transition">
          <div className="mb-4 flex items-center gap-2">
            <Newspaper size={18} aria-hidden="true" className="text-[var(--accent)]" />
            <h3 className="text-xl font-semibold text-[var(--foreground)]">Recent news sentiment</h3>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {visibleNews.map((item) => (
              <article
                key={item.source_id}
                className="premium-card rounded-[1.1rem] p-4 transition"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#1f1a17] px-2 py-1 text-xs font-semibold text-[#efe5d6]">
                    {item.symbol}
                  </span>
                  <span
                    className={`rounded-full border px-2 py-1 text-xs font-semibold capitalize ${sentimentTone(item.sentiment)}`}
                  >
                    {item.sentiment}
                  </span>
                  <span className="text-xs text-[var(--muted)]">
                    {formatDate(item.published_at)}
                  </span>
                </div>
                <h4 className="mt-3 font-semibold leading-6 text-[var(--foreground)]">
                  {item.url ? (
                    <a href={item.url} target="_blank" rel="noreferrer">
                      {item.title}
                    </a>
                  ) : (
                    item.title
                  )}
                </h4>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.summary}</p>
                <p className="mt-3 text-xs text-[var(--muted)]">
                  Source: {sourceLabel(sourceById.get(item.source_id))}
                </p>
              </article>
            ))}
          </div>
          <PaginationControls
            currentPage={newsPage}
            pageSize={NEWS_PAGE_SIZE}
            totalItems={result.news.length}
            label="headlines"
            onPageChange={setNewsPage}
          />
        </section>
      ) : null}

      {result.documents.length > 0 ? (
        <section className="premium-card rounded-[1.5rem] p-5 transition">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles size={18} aria-hidden="true" className="text-[var(--accent)]" />
            <h3 className="text-xl font-semibold text-[var(--foreground)]">RAG evidence</h3>
          </div>
          <div className="grid gap-3 xl:grid-cols-2">
            {visibleDocuments.map((document) => (
              <article
                key={document.source_id}
                className="premium-card rounded-[1.1rem] p-4 transition"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#e8f2ee] px-2 py-1 text-xs font-semibold text-[var(--accent-strong)]">
                    {document.symbol}
                  </span>
                  <span className="text-xs text-[var(--muted)]">
                    Retrieval score {document.score.toFixed(2)}
                  </span>
                </div>
                <h4 className="mt-3 font-semibold text-[var(--foreground)]">{document.title}</h4>
                <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">{document.excerpt}</p>
                <p className="mt-3 text-xs text-[var(--muted)]">
                  Source: {sourceLabel(sourceById.get(document.source_id))}
                </p>
              </article>
            ))}
          </div>
          <PaginationControls
            currentPage={documentPage}
            pageSize={DOCUMENT_PAGE_SIZE}
            totalItems={result.documents.length}
            label="documents"
            onPageChange={setDocumentPage}
          />
        </section>
      ) : null}

      <section className="premium-card rounded-[1.5rem] p-5 transition">
        <h3 className="text-xl font-semibold text-[var(--foreground)]">Source register</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleSources.map((source) => (
            <article
              key={source.id}
              className="premium-card rounded-[1rem] p-3 text-sm transition"
            >
              <p className="font-semibold text-[var(--foreground)]">{source.id}</p>
              <p className="mt-1 leading-5 text-[var(--muted)]">
                {source.url ? (
                  <a href={source.url} target="_blank" rel="noreferrer">
                    {source.title}
                  </a>
                ) : (
                  source.title
                )}
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.08em] text-[var(--muted)]">
                {source.type.replace(/_/g, " ")}
              </p>
            </article>
          ))}
        </div>
        <PaginationControls
          currentPage={sourcePage}
          pageSize={SOURCE_PAGE_SIZE}
          totalItems={result.sources.length}
          label="sources"
          onPageChange={setSourcePage}
        />
      </section>
    </div>
  );
}
