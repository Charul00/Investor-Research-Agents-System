"use client";

import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  Database,
  ExternalLink,
  FileText,
  History,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  Newspaper,
  PanelLeftClose,
  PanelLeftOpen,
  Save,
  Search,
  SendHorizontal,
  Sparkles,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { startTransition, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";

import { MiniPriceChart } from "@/components/research-results";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Toast } from "@/components/toast";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import {
  AuthSession,
  CompanyMetric,
  DocumentSnippet,
  NewsItem,
  Report,
  ResearchResponse,
  SourceReference,
  apiFetch,
  clearSession,
  setActiveMembership,
} from "@/lib/api";

type ResearchStudioProps = {
  initialSession: AuthSession;
};

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
  isLoading?: boolean;
};

type StudioTab = "answer" | "market" | "news" | "documents" | "sources";

const DEFAULT_QUERY =
  "Show only NVIDIA latest stock price, volume, P/E, revenue, EPS, and recent price performance.";

const SAMPLE_QUERIES = [
  "Summarize only the recent news sentiment for Tesla. Do not analyze stock price.",
  "Compare NVIDIA, AMD, and Intel stock performance and recent news sentiment.",
  "Analyze NVIDIA earnings report details from filings. Focus on data center growth and competition.",
];

function getMessageId(prefix: string) {
  if (window.crypto?.randomUUID) {
    return `${prefix}-${window.crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function sourceLabel(source?: SourceReference) {
  if (!source) {
    return "Source available";
  }
  return `${source.provider}: ${source.title}`;
}

function TypingLoader() {
  return (
    <span className="typing-loader" aria-label="Loading">
      <span />
      <span />
      <span />
    </span>
  );
}

function sentimentTone(sentiment: string) {
  if (sentiment === "positive") {
    return "bg-[#ecf8f1] text-[#167047]";
  }
  if (sentiment === "negative") {
    return "bg-[#fff1ef] text-[#9a3412]";
  }
  return "bg-[#f5f7fb] text-[#475467]";
}

function marketCard(company: CompanyMetric, source?: SourceReference) {
  return (
    <article key={company.symbol} className="premium-card rounded-[1.35rem] p-4 transition">
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
            {formatCompactNumber(company.volume)}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--muted)]">Market cap</dt>
          <dd className="font-semibold text-[var(--foreground)]">{company.market_cap}</dd>
        </div>
        <div>
          <dt className="text-[var(--muted)]">P/E</dt>
          <dd className="font-semibold text-[var(--foreground)]">{company.pe_ratio ?? "N/A"}</dd>
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

function emptyPanel(title: string, body: string) {
  return (
    <div className="rounded-[1.4rem] border border-dashed border-[var(--border-strong)] bg-white/70 p-6 text-[var(--muted)]">
      <p className="font-semibold text-[var(--foreground)]">{title}</p>
      <p className="mt-2 text-sm leading-6">{body}</p>
    </div>
  );
}

export function ResearchStudio({ initialSession }: ResearchStudioProps) {
  const [session, setSession] = useState(initialSession);
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [result, setResult] = useState<ResearchResponse | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [historySearch, setHistorySearch] = useState("");
  const [activeTab, setActiveTab] = useState<StudioTab>("answer");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
  const [error, setError] = useState("");
  const [toastTitle, setToastTitle] = useState("Something needs attention");
  const chatStreamRef = useRef<HTMLDivElement | null>(null);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => Promise<void>;
  } | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "assistant-welcome",
      role: "assistant",
      text: "Ask a research question. I will choose the right data tools, fetch evidence, and organize the result into tabs.",
    },
  ]);

  const sourceById = useMemo(
    () => new Map(result?.sources.map((source) => [source.id, source]) ?? []),
    [result],
  );
  const filteredReports = reports.filter((report) => {
    const search = historySearch.trim().toLowerCase();
    if (!search) {
      return true;
    }
    return (
      report.title.toLowerCase().includes(search) ||
      report.query_text.toLowerCase().includes(search) ||
      report.tags.some((tag) => tag.includes(search))
    );
  });

  function showError(message: string, title = "Something needs attention") {
    setToastTitle(title);
    setError(message);
  }

  function scrollChatToBottom(behavior: ScrollBehavior = "smooth") {
    chatStreamRef.current?.scrollTo({
      top: chatStreamRef.current.scrollHeight,
      behavior,
    });
    setShowJumpToLatest(false);
  }

  function handleChatScroll() {
    const element = chatStreamRef.current;
    if (!element) {
      return;
    }
    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    setShowJumpToLatest(distanceFromBottom > 96);
  }

  const loadReports = useEffectEvent(async () => {
    try {
      const response = await apiFetch<{ reports: Report[] }>(
        "/reports",
        { method: "GET" },
        session,
      );
      setReports(response.reports);
    } catch (loadError) {
      showError(getErrorMessage(loadError, "Unable to load research history."), "History failed");
    }
  });

  const hydrateFromNavigation = useEffectEvent(() => {
    const params = new URLSearchParams(window.location.search);
    const queryFromUrl = params.get("query");
    if (queryFromUrl) {
      setQuery(queryFromUrl);
    }

    const cachedResult = sessionStorage.getItem("investment.research.lastResult");
    if (!cachedResult) {
      return;
    }

    try {
      const parsed = JSON.parse(cachedResult) as ResearchResponse;
      if (!queryFromUrl || parsed.query === queryFromUrl) {
        setResult(parsed);
        setMessages((current) => [
          ...current,
          { id: "assistant-cached", role: "assistant", text: parsed.executive_summary },
        ]);
      }
    } catch {
      sessionStorage.removeItem("investment.research.lastResult");
    }
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadReports();
      hydrateFromNavigation();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [session.active_membership.organization_id]);

  useEffect(() => {
    const element = chatStreamRef.current;
    if (!element) {
      return;
    }
    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    if (distanceFromBottom < 140) {
      scrollChatToBottom("smooth");
    } else {
      setShowJumpToLatest(true);
    }
  }, [messages]);

  async function runResearch(nextQuery = query) {
    const cleanQuery = nextQuery.trim();
    if (cleanQuery.length < 5) {
      showError("Please describe what you want the AI research system to analyze.", "Query needs detail");
      return;
    }

    setQuery(cleanQuery);
    setBusyKey("run-research");
    setError("");
    setMessages((current) => [
      ...current,
      { id: getMessageId("user"), role: "user", text: cleanQuery },
      {
        id: getMessageId("assistant-pending"),
        role: "assistant",
        text: "Researching",
        isLoading: true,
      },
    ]);

    try {
      const nextResult = await apiFetch<ResearchResponse>(
        "/research",
        {
          method: "POST",
          body: JSON.stringify({ query: cleanQuery }),
        },
        session,
      );
      setResult(nextResult);
      setActiveTab("answer");
      sessionStorage.setItem("investment.research.lastResult", JSON.stringify(nextResult));
      setMessages((current) => [
        ...current.filter((message) => !message.id.includes("assistant-pending")),
        {
          id: getMessageId("assistant-result"),
          role: "assistant",
          text: nextResult.executive_summary,
        },
      ]);
    } catch (submitError) {
      showError(
        getErrorMessage(submitError, "Unable to run AI research right now."),
        "Research failed",
      );
      setMessages((current) => [
        ...current.filter((message) => !message.id.includes("assistant-pending")),
        {
          id: getMessageId("assistant-error"),
          role: "assistant",
          text: "Try again",
        },
      ]);
    } finally {
      setBusyKey(null);
    }
  }

  async function saveResearchResult() {
    if (!result) {
      return;
    }

    const symbols = result.plan.symbols;
    const title =
      symbols.length > 0
        ? `AI research: ${symbols.join(" vs ")}`
        : "AI-generated investment research";

    setBusyKey("save-research");
    setError("");
    try {
      await apiFetch<Report>(
        "/reports",
        {
          method: "POST",
          body: JSON.stringify({
            title,
            query_text: result.query,
            summary: result.executive_summary,
            status: "complete",
            tags: ["ai-research", ...symbols.map((symbol) => symbol.toLowerCase())],
          }),
        },
        session,
      );
      const response = await apiFetch<{ reports: Report[] }>(
        "/reports",
        { method: "GET" },
        session,
      );
      setReports(response.reports);
    } catch (saveError) {
      showError(getErrorMessage(saveError, "Unable to save this research."), "Save failed");
    } finally {
      setBusyKey(null);
    }
  }

  function openSavedReport(report: Report) {
    setQuery(report.query_text);
    setResult(null);
    setActiveTab("answer");
    setMessages([
      {
        id: `history-${report.id}`,
        role: "assistant",
        text: report.summary ?? "Saved report selected. Run the query again for fresh data.",
      },
    ]);
  }

  async function deleteHistoryReport(reportId: string) {
    setBusyKey(`delete-history-${reportId}`);
    setError("");
    try {
      await apiFetch<void>(`/reports/${reportId}`, { method: "DELETE" }, session);
      setReports((current) => current.filter((report) => report.id !== reportId));
    } catch (deleteError) {
      showError(
        getErrorMessage(deleteError, "Unable to delete this history item."),
        "Delete failed",
      );
    } finally {
      setBusyKey(null);
      setConfirmAction(null);
    }
  }

  function requestDeleteHistoryReport(report: Report) {
    setConfirmAction({
      title: "Delete history item?",
      message: `"${report.title}" will be removed from your saved research history.`,
      confirmLabel: "Delete history",
      onConfirm: () => deleteHistoryReport(report.id),
    });
  }

  function renderTab() {
    if (!result) {
      return emptyPanel(
        "No research run yet",
        "Ask a question or select a saved report from history to start a focused research session.",
      );
    }

    if (activeTab === "answer") {
      return (
        <div className="space-y-4">
          <div className="premium-card rounded-[1.45rem] p-5 transition">
            <p className="eyebrow mb-2">Executive answer</p>
            <p className="text-base leading-8 text-[var(--ink-soft)]">{result.executive_summary}</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {result.insights.map((insight) => (
              <article
                key={`${insight.section}-${insight.title}`}
                className="premium-card rounded-[1.35rem] p-4 transition"
              >
                <p className="eyebrow mb-2">{insight.section}</p>
                <h3 className="text-lg font-semibold text-[var(--foreground)]">{insight.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">{insight.body}</p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--accent-strong)]">
                  {Math.round(insight.confidence * 100)}% confidence
                </p>
              </article>
            ))}
          </div>
        </div>
      );
    }

    if (activeTab === "market") {
      if (result.companies.length === 0) {
        return emptyPanel("No market data requested", "This query did not require market data.");
      }
      return (
        <div className="grid gap-4 lg:grid-cols-2">
          {result.companies.map((company) => marketCard(company, sourceById.get(company.source_id)))}
        </div>
      );
    }

    if (activeTab === "news") {
      if (result.news.length === 0) {
        return emptyPanel("No news data requested", "This query did not require news retrieval.");
      }
      return (
        <div className="space-y-3">
          {result.news.map((item: NewsItem) => (
            <article
              key={item.source_id}
              className="premium-card rounded-[1.2rem] p-4 transition"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#1f1a17] px-3 py-1 text-xs font-semibold text-[#efe5d6]">
                  {item.symbol}
                </span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${sentimentTone(item.sentiment)}`}>
                  {item.sentiment}
                </span>
                <span className="text-xs text-[var(--muted)]">{formatDate(item.published_at)}</span>
              </div>
              <h3 className="mt-3 font-semibold text-[var(--foreground)]">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.summary}</p>
              {item.url ? (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]"
                >
                  Open source
                  <ExternalLink size={14} aria-hidden="true" />
                </a>
              ) : null}
            </article>
          ))}
        </div>
      );
    }

    if (activeTab === "documents") {
      if (result.documents.length === 0) {
        return emptyPanel("No document evidence requested", "This query did not require RAG retrieval.");
      }
      return (
        <div className="space-y-3">
          {result.documents.map((document: DocumentSnippet) => (
            <article
              key={document.source_id}
              className="premium-card rounded-[1.2rem] p-4 transition"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#e8f2ee] px-3 py-1 text-xs font-semibold text-[var(--accent-strong)]">
                  {document.symbol}
                </span>
                <span className="text-xs text-[var(--muted)]">Score {document.score}</span>
              </div>
              <h3 className="mt-3 font-semibold text-[var(--foreground)]">{document.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{document.excerpt}</p>
            </article>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className="premium-card rounded-[1.2rem] p-4 transition">
          <p className="eyebrow mb-2">Plan</p>
          <p className="text-sm leading-6 text-[var(--muted)]">{result.plan.rationale}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {result.plan.tools.map((tool) => (
              <span
                key={tool}
                className="rounded-full border border-[var(--border)] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]"
              >
                {tool.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </div>
        {result.sources.map((source) => (
          <article
            key={source.id}
            className="premium-card rounded-[1.2rem] p-4 transition"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
              {source.type.replace(/_/g, " ")}
            </p>
            <h3 className="mt-2 font-semibold text-[var(--foreground)]">{source.title}</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">{source.provider}</p>
            {source.url ? (
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]"
              >
                Open source
                <ExternalLink size={14} aria-hidden="true" />
              </a>
            ) : null}
          </article>
        ))}
      </div>
    );
  }

  const tabs: Array<{ id: StudioTab; label: string; icon: typeof MessageSquareText; count?: number }> = [
    { id: "answer", label: "Answer", icon: MessageSquareText },
    { id: "market", label: "Market", icon: TrendingUp, count: result?.companies.length },
    { id: "news", label: "News", icon: Newspaper, count: result?.news.length },
    { id: "documents", label: "Documents", icon: BookOpen, count: result?.documents.length },
    { id: "sources", label: "Sources", icon: Database, count: result?.sources.length },
  ];

  return (
    <>
      <Toast message={error} title={toastTitle} onClose={() => setError("")} />
      <ConfirmDialog
        open={confirmAction !== null}
        title={confirmAction?.title ?? ""}
        message={confirmAction?.message ?? ""}
        confirmLabel={confirmAction?.confirmLabel}
        isBusy={busyKey?.startsWith("delete-history-") ?? false}
        onCancel={() => {
          if (!busyKey?.startsWith("delete-history-")) {
            setConfirmAction(null);
          }
        }}
        onConfirm={() => {
          void confirmAction?.onConfirm();
        }}
      />
      <main className="min-h-screen w-full px-4 py-5 sm:px-6 xl:px-8">
        <div
          className={
            isHistoryOpen
              ? "grid min-h-[calc(100vh-2.5rem)] gap-5 xl:grid-cols-[340px_minmax(0,1fr)]"
              : "grid min-h-[calc(100vh-2.5rem)] gap-5 xl:grid-cols-[88px_minmax(0,1fr)]"
          }
        >
          {isHistoryOpen ? (
            <aside className="glass-panel history-shell flex min-h-[28rem] flex-col p-4">
              <div className="flex items-center justify-between gap-3">
                <Link href="/dashboard" className="btn-secondary min-h-10 px-3 py-2 text-sm">
                  <ArrowLeft size={15} aria-hidden="true" />
                  Dashboard
                </Link>
                <button
                  type="button"
                  onClick={() => setIsHistoryOpen(false)}
                  className="history-toggle"
                  aria-label="Collapse research history"
                >
                  <PanelLeftClose size={15} aria-hidden="true" />
                  Close
                </button>
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="eyebrow">Research Studio</p>
                  <span className="rounded-full bg-[#e8f2ee] px-3 py-1 text-xs font-semibold capitalize text-[var(--accent-strong)]">
                    {session.active_membership.role}
                  </span>
                </div>
                <h1 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                  Previous history
                </h1>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  Select a saved report or collapse this panel for a wider research canvas.
                </p>
              </div>

              <div className="relative mt-5">
                <Search
                  size={16}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
                />
                <input
                  value={historySearch}
                  onChange={(event) => setHistorySearch(event.target.value)}
                  className="field field-with-icon"
                  placeholder="Search history"
                />
              </div>

              <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
                {filteredReports.length === 0 ? (
                  <div className="rounded-[1.2rem] border border-dashed border-[var(--border-strong)] bg-white/70 p-4 text-sm text-[var(--muted)]">
                    No saved reports match this search.
                  </div>
                ) : null}
                {filteredReports.slice(0, 12).map((report) => (
                  <article
                    key={report.id}
                    className="premium-card rounded-[1.2rem] p-4 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => openSavedReport(report)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="flex items-center gap-2">
                          <h2 className="line-clamp-1 font-semibold text-[var(--foreground)]">
                            {report.title}
                          </h2>
                          <History
                            size={15}
                            className="shrink-0 text-[var(--accent)]"
                            aria-hidden="true"
                          />
                        </div>
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--muted)]">
                          {report.query_text}
                        </p>
                        <p className="mt-3 text-xs text-[var(--muted)]">
                          {formatDate(report.updated_at)}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => requestDeleteHistoryReport(report)}
                        disabled={busyKey === `delete-history-${report.id}`}
                        className="history-delete-button"
                        aria-label={`Delete ${report.title} from history`}
                        title="Delete history"
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </aside>
          ) : (
            <aside className="history-rail history-shell flex min-h-[28rem] flex-col items-center justify-between">
              <button
                type="button"
                onClick={() => setIsHistoryOpen(true)}
                className="history-toggle"
                aria-label="Open research history"
              >
                <PanelLeftOpen size={15} aria-hidden="true" />
                <span className="sr-only">Open history</span>
              </button>
              <div className="flex flex-col items-center gap-4">
                <History size={22} aria-hidden="true" />
                <span className="history-rail-label">History</span>
              </div>
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
                {filteredReports.length}
              </span>
            </aside>
          )}

          <section className="space-y-5">
            <header className="glass-panel p-5 sm:p-6">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <p className="eyebrow mb-2">AI Research Workspace</p>
                  <h2 className="text-3xl font-semibold text-[var(--foreground)] sm:text-4xl">
                    Ask, compare, and verify sources.
                  </h2>
                  <p className="mt-3 max-w-3xl leading-7 text-[var(--muted)]">
                    A dedicated research surface with chat history, tabbed evidence, and the same
                    visual system as the dashboard.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-[minmax(0,280px)_auto_auto]">
                  <WorkspaceSwitcher
                    memberships={session.memberships}
                    activeOrganizationId={session.active_membership.organization_id}
                    onChange={(organizationId) => {
                      const nextSession = setActiveMembership(organizationId);
                      if (!nextSession) {
                        return;
                      }
                      startTransition(() => {
                        setSession(nextSession);
                        setResult(null);
                        setReports([]);
                      });
                    }}
                  />
                  <Link href="/dashboard" className="btn-secondary">
                    <LayoutDashboard size={16} aria-hidden="true" />
                    Dashboard
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      clearSession();
                      window.location.href = "/login";
                    }}
                    className="btn-secondary btn-logout"
                  >
                    <LogOut size={16} aria-hidden="true" />
                    Logout
                  </button>
                </div>
              </div>
            </header>

            <section className="grid gap-5 2xl:grid-cols-[minmax(0,0.92fr)_minmax(460px,1.08fr)]">
              <div className="glass-panel flex min-h-[36rem] flex-col p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="eyebrow mb-2">Conversation</p>
                    <h2 className="text-2xl font-semibold text-[var(--foreground)]">Research chat</h2>
                  </div>
                  {busyKey === "run-research" ? (
                    <span className="status-chip-live">
                      Running
                      <TypingLoader />
                    </span>
                  ) : null}
                </div>

                <div className="relative mt-4 flex-1 overflow-hidden rounded-[1.35rem] border border-[var(--border-strong)]">
                  <div
                    ref={chatStreamRef}
                    onScroll={handleChatScroll}
                    className="studio-chat-stream max-h-[22rem] min-h-[12rem] space-y-3 overflow-y-auto p-4 pr-5"
                  >
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={
                          message.isLoading
                            ? "max-w-[92%] px-1 py-1 text-sm font-semibold leading-6 text-[var(--foreground)]"
                            : message.role === "user"
                              ? "ml-auto max-w-[88%] rounded-[1.1rem] rounded-br-sm bg-[var(--accent)] px-4 py-3 text-sm leading-6 text-white"
                              : "max-w-[92%] rounded-[1.1rem] rounded-bl-sm border border-[var(--border-strong)] bg-white px-4 py-3 text-sm leading-6 text-[var(--foreground)] shadow-sm"
                        }
                      >
                        {message.isLoading ? (
                          <span className="inline-flex items-center gap-2 font-semibold">
                            {message.text}
                            <TypingLoader />
                          </span>
                        ) : (
                          message.text
                        )}
                      </div>
                    ))}
                  </div>
                  {showJumpToLatest ? (
                    <button
                      type="button"
                      onClick={() => scrollChatToBottom()}
                      className="chat-jump-button"
                      aria-label="Jump to latest message"
                    >
                      <ChevronDown size={16} aria-hidden="true" />
                    </button>
                  ) : null}
                </div>

                <form
                  className="mt-4 space-y-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void runResearch();
                  }}
                >
                  <textarea
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    disabled={busyKey === "run-research"}
                    className="field min-h-28 text-base leading-7"
                    placeholder="Ask about a company, news sentiment, filings, or a multi-company comparison."
                  />
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap gap-2">
                      {SAMPLE_QUERIES.map((sample) => (
                        <button
                          key={sample}
                          type="button"
                          onClick={() => setQuery(sample)}
                          className="rounded-full border border-[var(--border-strong)] bg-white/85 px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] shadow-sm transition hover:-translate-y-0.5 hover:border-[rgba(15,118,110,0.44)] hover:bg-[#f2fbf8]"
                        >
                          {sample.split(".")[0]}
                        </button>
                      ))}
                    </div>
                    <button
                      type="submit"
                      disabled={busyKey === "run-research"}
                      className="research-send-button"
                      title="Run research"
                      aria-label="Run research"
                    >
                      {busyKey === "run-research" ? <TypingLoader /> : <SendHorizontal size={18} aria-hidden="true" />}
                    </button>
                  </div>
                </form>
              </div>

              <div className="glass-panel p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="eyebrow mb-2">Structured output</p>
                    <h2 className="text-2xl font-semibold text-[var(--foreground)]">
                      Research tabs
                    </h2>
                    {result ? (
                      <p className="mt-2 text-sm text-[var(--muted)]">
                        {result.latency_ms}ms latency. {result.sources.length} source references.
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={saveResearchResult}
                    disabled={!result || busyKey === "save-research"}
                    className="btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Save size={16} aria-hidden="true" />
                    {busyKey === "save-research" ? "Saving..." : "Save report"}
                  </button>
                </div>

                <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
                  {tabs.map(({ id, label, icon: Icon, count }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setActiveTab(id)}
                      className={
                        activeTab === id
                          ? "inline-flex shrink-0 items-center gap-2 rounded-full bg-[var(--accent-deep)] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-950/15"
                          : "inline-flex shrink-0 items-center gap-2 rounded-full border border-[var(--border-strong)] bg-white/85 px-4 py-2 text-sm font-semibold text-[var(--foreground)] shadow-sm transition hover:-translate-y-0.5 hover:border-[rgba(15,118,110,0.42)] hover:bg-[#f2fbf8]"
                      }
                    >
                      <Icon size={15} aria-hidden="true" />
                      {label}
                      {typeof count === "number" ? (
                        <span className="rounded-full bg-black/10 px-2 py-0.5 text-xs">{count}</span>
                      ) : null}
                    </button>
                  ))}
                </div>

                <div className="mt-5">{renderTab()}</div>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-3">
              {[
                {
                  label: "Selected tools",
                  value: result?.plan.tools.length ?? 0,
                  note: result ? result.plan.tools.join(", ").replace(/_/g, " ") : "Run a query",
                  icon: Sparkles,
                },
                {
                  label: "Market rows",
                  value: result?.companies.length ?? 0,
                  note: result ? `${result?.companies.length ?? 0} companies analyzed` : "No run yet",
                  icon: TrendingUp,
                },
                {
                  label: "Sources",
                  value: result?.sources.length ?? 0,
                  note: result ? `${formatNumber(result.sources.length)} references` : "No sources yet",
                  icon: FileText,
                },
              ].map(({ label, value, note, icon: Icon }) => (
                <article key={label} className="glass-panel p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="eyebrow">{label}</p>
                    <Icon size={18} className="text-[var(--accent)]" aria-hidden="true" />
                  </div>
                  <p className="mt-3 text-3xl font-semibold text-[var(--foreground)]">{value}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{note}</p>
                </article>
              ))}
            </section>
          </section>
        </div>
      </main>
    </>
  );
}
