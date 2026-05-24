"use client";

import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  Copy,
  LogOut,
  Pencil,
  Plus,
  Save,
  Search,
  Sparkles,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { startTransition, useEffect, useEffectEvent, useMemo, useState } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { FloatingAgentLauncher } from "@/components/floating-agent-launcher";
import { PaginationControls } from "@/components/pagination-controls";
import { Toast } from "@/components/toast";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import {
  apiFetch,
  AuthSession,
  DashboardResponse,
  MembershipRole,
  MeResponse,
  Report,
  ReportStatus,
  ResearchResponse,
  WatchlistItem,
  clearSession,
  saveSession,
  setActiveMembership,
} from "@/lib/api";

type WorkspaceDashboardProps = {
  initialSession: AuthSession;
};

type ReportFormState = {
  title: string;
  queryText: string;
  summary: string;
  status: ReportStatus;
  tags: string;
};

type WatchlistFormState = {
  symbol: string;
  companyName: string;
  notes: string;
};

type InviteFormState = {
  email: string;
  role: MembershipRole;
  expiresInDays: string;
};

type InviteResponse = {
  id: string;
  code: string;
  role: MembershipRole;
  email: string | null;
  expires_at: string;
};

type OrganizationResponse = {
  id: string;
  name: string;
  slug: string;
};

const defaultReportForm: ReportFormState = {
  title: "",
  queryText: "",
  summary: "",
  status: "draft",
  tags: "",
};

const defaultWatchlistForm: WatchlistFormState = {
  symbol: "",
  companyName: "",
  notes: "",
};

const defaultInviteForm: InviteFormState = {
  email: "",
  role: "analyst",
  expiresInDays: "7",
};

const REPORTS_PAGE_SIZE = 3;
const WATCHLIST_PAGE_SIZE = 3;
const ORGANIZATIONS_PAGE_SIZE = 3;
const COMPARE_RESEARCH_QUERY =
  "Compare NVIDIA, AMD, and Intel stock performance, valuation metrics, recent news sentiment, and key risks.";
const COMPARE_RESEARCH_HREF = `/research?query=${encodeURIComponent(COMPARE_RESEARCH_QUERY)}`;

function getPageCount(totalItems: number, pageSize: number) {
  return Math.max(1, Math.ceil(totalItems / pageSize));
}

function paginateItems<T>(items: T[], page: number, pageSize: number) {
  return items.slice((page - 1) * pageSize, page * pageSize);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function statusLabel(status: ReportStatus) {
  if (status === "complete") {
    return "Complete";
  }
  if (status === "failed") {
    return "Failed";
  }
  return "Draft";
}

function statusTone(status: ReportStatus) {
  if (status === "complete") {
    return "bg-[#e8f2ee] text-[var(--accent-strong)]";
  }
  if (status === "failed") {
    return "bg-[#fff1ef] text-[#8a2c2c]";
  }
  return "bg-[#f4ead7] text-[#7c5a1f]";
}

function parseTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function validateReportForm(form: ReportFormState) {
  if (form.title.trim().length < 2) {
    return "Please enter a report title.";
  }
  if (form.queryText.trim().length < 5) {
    return "Please describe the research request in at least 5 characters.";
  }
  return "";
}

function validateResearchQuery(value: string) {
  if (value.trim().length < 5) {
    return "Please describe what you want the AI research agent to analyze.";
  }
  return "";
}

function validateWatchlistForm(form: Pick<WatchlistFormState, "symbol" | "companyName">) {
  if (!form.symbol.trim()) {
    return "Please enter a ticker symbol.";
  }
  if (form.companyName.trim().length < 2) {
    return "Please enter the company name.";
  }
  return "";
}

function validateInviteForm(form: InviteFormState) {
  const expiresInDays = Number(form.expiresInDays);
  if (!Number.isInteger(expiresInDays) || expiresInDays < 1 || expiresInDays > 30) {
    return "Please choose an invite expiry between 1 and 30 days.";
  }
  return "";
}

export function WorkspaceDashboard({ initialSession }: WorkspaceDashboardProps) {
  const [session, setSession] = useState(initialSession);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [toastTitle, setToastTitle] = useState("Something needs attention");
  const [reportForm, setReportForm] = useState<ReportFormState>(defaultReportForm);
  const [watchlistForm, setWatchlistForm] = useState<WatchlistFormState>(defaultWatchlistForm);
  const [inviteForm, setInviteForm] = useState<InviteFormState>(defaultInviteForm);
  const [lastInvite, setLastInvite] = useState<InviteResponse | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [joinInviteCode, setJoinInviteCode] = useState("");
  const [workspaceNotice, setWorkspaceNotice] = useState("");
  const [reportSearch, setReportSearch] = useState("");
  const [reportFilter, setReportFilter] = useState<ReportStatus | "all">("all");
  const [reportPage, setReportPage] = useState(1);
  const [watchlistPage, setWatchlistPage] = useState(1);
  const [organizationPage, setOrganizationPage] = useState(1);
  const [researchResult, setResearchResult] = useState<ResearchResponse | null>(null);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [editingReportForm, setEditingReportForm] = useState<ReportFormState>(defaultReportForm);
  const [editingWatchlistId, setEditingWatchlistId] = useState<string | null>(null);
  const [editingWatchlistForm, setEditingWatchlistForm] =
    useState<WatchlistFormState>(defaultWatchlistForm);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => Promise<void>;
  } | null>(null);

  function showError(message: string, title = "Something needs attention") {
    setToastTitle(title);
    setError(message);
  }

  function showCaughtError(
    caughtError: unknown,
    fallback: string,
    title = "Something needs attention",
  ) {
    showError(getErrorMessage(caughtError, fallback), title);
  }

  async function fetchWorkspace(search = reportSearch, filter = reportFilter) {
    const currentSession = session;

    setStatus("loading");
    setError("");

    try {
      const query = new URLSearchParams();
      if (search.trim()) {
        query.set("search", search.trim());
      }
      if (filter !== "all") {
        query.set("status", filter);
      }

      const [meResponse, dashboardResponse, reportsResponse, watchlistResponse] =
        await Promise.all([
          apiFetch<MeResponse>("/auth/me", { method: "GET" }, currentSession),
          apiFetch<DashboardResponse>("/dashboard", { method: "GET" }, currentSession),
          apiFetch<{ reports: Report[] }>(
            `/reports${query.toString() ? `?${query.toString()}` : ""}`,
            { method: "GET" },
            currentSession,
          ),
          apiFetch<{ items: WatchlistItem[] }>("/watchlist", { method: "GET" }, currentSession),
        ]);

      setMe(meResponse);
      setDashboard(dashboardResponse);
      setReports(reportsResponse.reports);
      setWatchlist(watchlistResponse.items);
      setStatus("ready");
    } catch (loadError) {
      showCaughtError(loadError, "Unable to load workspace.", "Unable to load workspace");
      setStatus("error");
    }
  }

  const runOrgLoad = useEffectEvent(() => {
    void fetchWorkspace();
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      runOrgLoad();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [session.active_membership.organization_id]);

  const runReportFilterLoad = useEffectEvent((search: string, filter: ReportStatus | "all") => {
    void fetchWorkspace(search, filter);
  });

  const hasDashboard = dashboard !== null;

  useEffect(() => {
    if (!hasDashboard) {
      return;
    }

    const timer = window.setTimeout(() => {
      runReportFilterLoad(reportSearch, reportFilter);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [reportSearch, reportFilter, hasDashboard]);

  const visibleWorkspaceName = useMemo(
    () => dashboard?.workspace.organization_name ?? session.active_membership.organization_name,
    [dashboard, session.active_membership.organization_name],
  );
  const isCurrentUserAdmin = session.active_membership.role === "admin";
  const reportPageCount = getPageCount(reports.length, REPORTS_PAGE_SIZE);
  const watchlistPageCount = getPageCount(watchlist.length, WATCHLIST_PAGE_SIZE);
  const memberships = me?.memberships ?? [];
  const organizationPageCount = getPageCount(memberships.length, ORGANIZATIONS_PAGE_SIZE);
  const safeReportPage = Math.min(reportPage, reportPageCount);
  const safeWatchlistPage = Math.min(watchlistPage, watchlistPageCount);
  const safeOrganizationPage = Math.min(organizationPage, organizationPageCount);
  const paginatedReports = paginateItems(reports, safeReportPage, REPORTS_PAGE_SIZE);
  const paginatedWatchlist = paginateItems(watchlist, safeWatchlistPage, WATCHLIST_PAGE_SIZE);
  const paginatedMemberships = paginateItems(
    memberships,
    safeOrganizationPage,
    ORGANIZATIONS_PAGE_SIZE,
  );

  async function refreshReports() {
    await fetchWorkspace();
  }

  async function runResearchQuery(queryText: string) {
    setError("");

    const validationError = validateResearchQuery(queryText);
    if (validationError) {
      showError(validationError, "Research query needs more detail");
      return null;
    }

    setBusyKey("run-research");

    try {
      const result = await apiFetch<ResearchResponse>(
        "/research",
        {
          method: "POST",
          body: JSON.stringify({ query: queryText }),
        },
        session,
      );
      setResearchResult(result);
      return result;
    } catch (submitError) {
      showCaughtError(
        submitError,
        "Unable to run AI research right now.",
        "Research engine needs attention",
      );
      return null;
    } finally {
      setBusyKey(null);
    }
  }

  async function handleCreateReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const validationError = validateReportForm(reportForm);
    if (validationError) {
      showError(validationError, "Report needs a little more detail");
      return;
    }

    setBusyKey("create-report");

    try {
      await apiFetch<Report>(
        "/reports",
        {
          method: "POST",
          body: JSON.stringify({
            title: reportForm.title,
            query_text: reportForm.queryText,
            summary: reportForm.summary || null,
            status: reportForm.status,
            tags: parseTags(reportForm.tags),
          }),
        },
        session,
      );
      setReportForm(defaultReportForm);
      await refreshReports();
    } catch (submitError) {
      showCaughtError(submitError, "Unable to create report.", "Report was not saved");
    } finally {
      setBusyKey(null);
    }
  }

  async function handleCreateWatchlistItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const validationError = validateWatchlistForm(watchlistForm);
    if (validationError) {
      showError(validationError, "Watchlist needs a little more detail");
      return;
    }

    setBusyKey("create-watchlist");

    try {
      await apiFetch<WatchlistItem>(
        "/watchlist",
        {
          method: "POST",
          body: JSON.stringify({
            symbol: watchlistForm.symbol,
            company_name: watchlistForm.companyName,
            notes: watchlistForm.notes || null,
          }),
        },
        session,
      );
      setWatchlistForm(defaultWatchlistForm);
      await refreshReports();
    } catch (submitError) {
      showCaughtError(submitError, "Unable to add watchlist item.", "Company was not added");
    } finally {
      setBusyKey(null);
    }
  }

  async function handleCreateInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const validationError = validateInviteForm(inviteForm);
    if (validationError) {
      showError(validationError, "Invite needs a valid expiry");
      return;
    }

    setBusyKey("create-invite");
    setInviteCopied(false);

    try {
      const invite = await apiFetch<InviteResponse>(
        "/organizations/invites",
        {
          method: "POST",
          body: JSON.stringify({
            email: inviteForm.email.trim() || null,
            role: inviteForm.role,
            expires_in_days: Number(inviteForm.expiresInDays),
          }),
        },
        session,
      );
      setLastInvite(invite);
      setInviteForm(defaultInviteForm);
    } catch (submitError) {
      showCaughtError(submitError, "Unable to create invite code.", "Invite was not created");
    } finally {
      setBusyKey(null);
    }
  }

  async function handleCreateOrganization(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setWorkspaceNotice("");

    if (newWorkspaceName.trim().length < 2) {
      showError("Please enter a workspace name.", "Workspace needs a name");
      return;
    }

    setBusyKey("create-organization");

    try {
      const organization = await apiFetch<OrganizationResponse>(
        "/organizations",
        {
          method: "POST",
          body: JSON.stringify({ name: newWorkspaceName.trim() }),
        },
        session,
      );
      const meResponse = await apiFetch<MeResponse>("/auth/me", { method: "GET" }, session);
      const nextActiveMembership =
        meResponse.memberships.find(
          (membership) => membership.organization_id === organization.id,
        ) ?? session.active_membership;
      const nextSession = {
        ...session,
        memberships: meResponse.memberships,
        active_membership: nextActiveMembership,
      };
      saveSession(nextSession);
      startTransition(() => {
        setSession(nextSession);
        setMe(meResponse);
        setReportPage(1);
        setWatchlistPage(1);
        setOrganizationPage(1);
      });
      setNewWorkspaceName("");
      setWorkspaceNotice(`${organization.name} was created and added to your workspace switcher.`);
    } catch (submitError) {
      showCaughtError(submitError, "Unable to create workspace.", "Workspace was not created");
    } finally {
      setBusyKey(null);
    }
  }

  async function handleJoinOrganization(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setWorkspaceNotice("");

    if (joinInviteCode.trim().length < 6) {
      showError("Please enter a valid invite code.", "Invite code required");
      return;
    }

    setBusyKey("join-organization");

    try {
      await apiFetch<{ message: string }>(
        "/organizations/join",
        {
          method: "POST",
          body: JSON.stringify({ code: joinInviteCode.trim().toUpperCase() }),
        },
        session,
      );
      const meResponse = await apiFetch<MeResponse>("/auth/me", { method: "GET" }, session);
      const nextSession = {
        ...session,
        memberships: meResponse.memberships,
      };
      saveSession(nextSession);
      startTransition(() => {
        setSession(nextSession);
        setMe(meResponse);
        setOrganizationPage(1);
      });
      setJoinInviteCode("");
      setWorkspaceNotice("Invite accepted. The new workspace is now available in your switcher.");
    } catch (submitError) {
      showCaughtError(submitError, "Unable to join workspace.", "Invite was not accepted");
    } finally {
      setBusyKey(null);
    }
  }

  async function copyInviteCode() {
    if (!lastInvite) {
      return;
    }

    try {
      await navigator.clipboard.writeText(lastInvite.code);
      setInviteCopied(true);
    } catch {
      showError("Copy failed. Please select and copy the invite code manually.", "Copy failed");
    }
  }

  async function deleteReport(reportId: string) {
    setBusyKey(`delete-report-${reportId}`);
    setError("");
    try {
      await apiFetch<void>(`/reports/${reportId}`, { method: "DELETE" }, session);
      await refreshReports();
    } catch (submitError) {
      showCaughtError(submitError, "Unable to delete report.", "Report was not deleted");
    } finally {
      setBusyKey(null);
      setConfirmAction(null);
    }
  }

  async function deleteWatchlistItem(itemId: string) {
    setBusyKey(`delete-watchlist-${itemId}`);
    setError("");
    try {
      await apiFetch<void>(
        `/watchlist/${itemId}`,
        { method: "DELETE" },
        session,
      );
      await refreshReports();
    } catch (submitError) {
      showCaughtError(
        submitError,
        "Unable to delete watchlist item.",
        "Company was not removed",
      );
    } finally {
      setBusyKey(null);
      setConfirmAction(null);
    }
  }

  function requestDeleteReport(report: Report) {
    setConfirmAction({
      title: "Delete saved report?",
      message: `"${report.title}" will be removed from this workspace history. This action cannot be undone.`,
      confirmLabel: "Delete report",
      onConfirm: () => deleteReport(report.id),
    });
  }

  function requestDeleteWatchlistItem(item: WatchlistItem) {
    setConfirmAction({
      title: "Remove company?",
      message: `${item.company_name} (${item.symbol}) will be removed from the workspace watchlist.`,
      confirmLabel: "Remove company",
      onConfirm: () => deleteWatchlistItem(item.id),
    });
  }

  async function handleUpdateReport(reportId: string) {
    setError("");

    const validationError = validateReportForm(editingReportForm);
    if (validationError) {
      showError(validationError, "Report needs a little more detail");
      return;
    }

    setBusyKey(`update-report-${reportId}`);
    try {
      await apiFetch<Report>(
        `/reports/${reportId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            title: editingReportForm.title,
            query_text: editingReportForm.queryText,
            summary: editingReportForm.summary || null,
            status: editingReportForm.status,
            tags: parseTags(editingReportForm.tags),
          }),
        },
        session,
      );
      setEditingReportId(null);
      setEditingReportForm(defaultReportForm);
      await refreshReports();
    } catch (submitError) {
      showCaughtError(submitError, "Unable to update report.", "Report was not updated");
    } finally {
      setBusyKey(null);
    }
  }

  async function handleUpdateWatchlistItem(itemId: string) {
    setError("");

    const validationError = validateWatchlistForm(editingWatchlistForm);
    if (validationError) {
      showError(validationError, "Watchlist needs a little more detail");
      return;
    }

    setBusyKey(`update-watchlist-${itemId}`);
    try {
      await apiFetch<WatchlistItem>(
        `/watchlist/${itemId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            company_name: editingWatchlistForm.companyName,
            notes: editingWatchlistForm.notes || null,
          }),
        },
        session,
      );
      setEditingWatchlistId(null);
      setEditingWatchlistForm(defaultWatchlistForm);
      await refreshReports();
    } catch (submitError) {
      showCaughtError(submitError, "Unable to update watchlist item.", "Company was not updated");
    } finally {
      setBusyKey(null);
    }
  }

  if (status === "loading" && !dashboard) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-8 sm:px-6 md:px-10">
        <div className="glass-panel rounded-[2rem] px-8 py-6 text-lg text-[var(--muted)]">
          Loading workspace data...
        </div>
      </main>
    );
  }

  if (status === "error" && !dashboard) {
    return (
      <>
        <Toast message={error} title={toastTitle} onClose={() => setError("")} />
        <main className="flex min-h-screen w-full items-center justify-center px-4 py-8 sm:px-6">
          <div className="glass-panel max-w-xl rounded-[2.2rem] p-8">
            <p className="eyebrow mb-3">Workspace load failed</p>
            <h1 className="text-3xl font-semibold text-[var(--foreground)]">
              We couldn&apos;t load your workspace.
            </h1>
            <p className="mt-3 leading-7 text-[var(--muted)]">
              Please sign in again or retry after a moment.
            </p>
            <button
              onClick={() => {
                clearSession();
                window.location.href = "/login";
              }}
              className="btn-primary mt-6"
            >
              Reset session
            </button>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Toast message={error} title={toastTitle} onClose={() => setError("")} />
      <ConfirmDialog
        open={confirmAction !== null}
        title={confirmAction?.title ?? ""}
        message={confirmAction?.message ?? ""}
        confirmLabel={confirmAction?.confirmLabel}
        isBusy={busyKey?.startsWith("delete-") ?? false}
        onCancel={() => {
          if (!busyKey?.startsWith("delete-")) {
            setConfirmAction(null);
          }
        }}
        onConfirm={() => {
          void confirmAction?.onConfirm();
        }}
      />
      <main className="min-h-screen w-full px-4 py-6 sm:px-6 xl:px-8 2xl:px-10">
      <header className="glass-panel p-5 sm:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <p className="eyebrow mb-3">Research Workspace</p>
            <h1 className="text-3xl font-semibold text-[var(--foreground)] sm:text-4xl">
              {visibleWorkspaceName}
            </h1>
            <p className="mt-3 max-w-3xl leading-7 text-[var(--muted)]">
              Build, store, and revisit organization research with structured reports and company
              watchlists in one place.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-white/60 p-3 shadow-sm">
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-end xl:w-auto">
            <div className="w-full sm:w-72">
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
                    setReportPage(1);
                    setWatchlistPage(1);
                    setOrganizationPage(1);
                  });
                }}
              />
            </div>
            <button
              onClick={() => {
                clearSession();
                window.location.href = "/login";
              }}
              className="btn-secondary btn-logout w-full sm:w-auto sm:self-end"
            >
              <LogOut size={16} aria-hidden="true" />
              Logout
            </button>
            <Link href="/research" className="btn-primary w-full sm:w-auto sm:self-end">
              Open Research Studio
            </Link>
            </div>
          </div>
        </div>
      </header>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Saved reports",
            value: String(dashboard?.stats.saved_reports ?? 0),
            note: "Research briefs stored in this workspace",
          },
          {
            label: "Completed briefs",
            value: String(dashboard?.stats.completed_reports ?? 0),
            note: "Reports marked ready for review",
          },
          {
            label: "Watchlist names",
            value: String(dashboard?.stats.watchlist_items ?? 0),
            note: "Companies your team is tracking",
          },
          {
            label: "Active members",
            value: String(dashboard?.stats.active_members ?? 0),
            note: "Users with access to this workspace",
          },
        ].map((item) => (
          <div key={item.label} className="glass-panel premium-card px-5 py-5 sm:px-6">
            <p className="eyebrow mb-3">{item.label}</p>
            <div className="text-3xl font-semibold text-[var(--foreground)]">{item.value}</div>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.note}</p>
          </div>
        ))}
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-4">
        {[
          {
            label: "New Research",
            description: "Ask the AI agents for a fresh source-backed market brief.",
            href: "/research",
            icon: Sparkles,
          },
          {
            label: "Compare Companies",
            description: "Open a ready-to-edit comparison for NVIDIA, AMD, and Intel.",
            href: COMPARE_RESEARCH_HREF,
            icon: BarChart3,
          },
          {
            label: "Saved Reports",
            description: "Review recent research queries and saved workspace briefs.",
            href: "#saved-research",
            icon: BookOpen,
          },
          {
            label: "Track Company",
            description: "Bookmark a company and keep coverage notes in the watchlist.",
            href: "#watchlist",
            icon: Plus,
          },
        ].map((action) => {
          const ActionIcon = action.icon;
          return (
            <Link
              key={action.label}
              href={action.href}
              className="premium-card group rounded-[1.45rem] p-5 transition hover:-translate-y-1"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e8f2ee] text-[var(--accent-strong)] shadow-[0_10px_24px_rgba(6,78,59,0.1)] transition group-hover:bg-[var(--accent-strong)] group-hover:text-white">
                <ActionIcon size={18} aria-hidden="true" />
              </div>
              <h2 className="text-lg font-semibold text-[var(--foreground)]">{action.label}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{action.description}</p>
            </Link>
          );
        })}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
        <div className="space-y-6">
          <div id="new-report" className="glass-panel scroll-mt-24 p-5 sm:p-6">
            <div className="mb-5">
              <p className="eyebrow mb-2">New report</p>
              <h2 className="text-2xl font-semibold text-[var(--foreground)]">
                Save a structured research brief
              </h2>
            </div>

            <form className="grid gap-4" onSubmit={handleCreateReport} noValidate>
              <input
                value={reportForm.title}
                onChange={(event) =>
                  setReportForm((current) => ({ ...current, title: event.target.value }))
                }
                className="field"
                placeholder="Report title"
                required
              />
              <textarea
                value={reportForm.queryText}
                onChange={(event) =>
                  setReportForm((current) => ({ ...current, queryText: event.target.value }))
                }
                className="field min-h-28"
                placeholder="What should this research cover?"
                required
              />
              <textarea
                value={reportForm.summary}
                onChange={(event) =>
                  setReportForm((current) => ({ ...current, summary: event.target.value }))
                }
                className="field min-h-24"
                placeholder="Brief summary"
              />
              <div className="grid gap-4 md:grid-cols-[0.8fr_1.2fr]">
                <select
                  value={reportForm.status}
                  onChange={(event) =>
                    setReportForm((current) => ({
                      ...current,
                      status: event.target.value as ReportStatus,
                    }))
                  }
                  className="field"
                >
                  <option value="draft">Draft</option>
                  <option value="complete">Complete</option>
                  <option value="failed">Failed</option>
                </select>
                <input
                  value={reportForm.tags}
                  onChange={(event) =>
                    setReportForm((current) => ({ ...current, tags: event.target.value }))
                  }
                  className="field"
                  placeholder="Tags, comma separated"
                />
              </div>
              <button
                type="submit"
                disabled={busyKey === "create-report"}
                className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={16} aria-hidden="true" />
                {busyKey === "create-report" ? "Saving..." : "Save report"}
              </button>
            </form>
          </div>

          <div id="saved-research" className="glass-panel scroll-mt-24 p-5 sm:p-6">
            <div className="mb-5 flex flex-col gap-4 2xl:flex-row 2xl:items-end 2xl:justify-between">
              <div>
                <p className="eyebrow mb-2">Saved research</p>
                <h2 className="text-2xl font-semibold text-[var(--foreground)]">
                  Workspace reports
                </h2>
              </div>
              <div className="space-y-2">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
                  <div className="relative">
                    <Search
                      size={16}
                      aria-hidden="true"
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
                    />
                    <input
                      value={reportSearch}
                      onChange={(event) => {
                        setReportSearch(event.target.value);
                        setReportPage(1);
                      }}
                      className="field field-with-icon"
                      placeholder="Search reports"
                    />
                  </div>
                  <select
                    value={reportFilter}
                    onChange={(event) => {
                      setReportFilter(event.target.value as ReportStatus | "all");
                      setReportPage(1);
                    }}
                    className="field"
                  >
                    <option value="all">All statuses</option>
                    <option value="draft">Draft</option>
                    <option value="complete">Complete</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
                <p className="text-xs text-[var(--muted)]">
                  {status === "loading"
                    ? "Updating results..."
                    : "Search and status filters apply automatically."}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {reports.length === 0 ? (
                <div className="rounded-[1.6rem] border border-dashed border-[var(--border)] bg-white/45 p-6 text-[var(--muted)]">
                  No reports match the current workspace filters yet.
                </div>
              ) : null}

              {paginatedReports.map((report) => {
                const isEditing = editingReportId === report.id;
                return (
                  <article
                    key={report.id}
                    className="premium-card rounded-[1.35rem] p-4 transition sm:p-5"
                  >
                    {isEditing ? (
                      <div className="space-y-4">
                        <input
                          value={editingReportForm.title}
                          onChange={(event) =>
                            setEditingReportForm((current) => ({
                              ...current,
                              title: event.target.value,
                            }))
                          }
                          className="field"
                        />
                        <textarea
                          value={editingReportForm.queryText}
                          onChange={(event) =>
                            setEditingReportForm((current) => ({
                              ...current,
                              queryText: event.target.value,
                            }))
                          }
                          className="field min-h-24"
                        />
                        <textarea
                          value={editingReportForm.summary}
                          onChange={(event) =>
                            setEditingReportForm((current) => ({
                              ...current,
                              summary: event.target.value,
                            }))
                          }
                          className="field min-h-20"
                        />
                        <div className="grid gap-3 md:grid-cols-2">
                          <select
                            value={editingReportForm.status}
                            onChange={(event) =>
                              setEditingReportForm((current) => ({
                                ...current,
                                status: event.target.value as ReportStatus,
                              }))
                            }
                            className="field"
                          >
                            <option value="draft">Draft</option>
                            <option value="complete">Complete</option>
                            <option value="failed">Failed</option>
                          </select>
                          <input
                            value={editingReportForm.tags}
                            onChange={(event) =>
                              setEditingReportForm((current) => ({
                                ...current,
                                tags: event.target.value,
                              }))
                            }
                            className="field"
                          />
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <button
                            onClick={() => handleUpdateReport(report.id)}
                            className="btn-primary"
                          >
                            <Save size={16} aria-hidden="true" />
                            {busyKey === `update-report-${report.id}` ? "Saving..." : "Save changes"}
                          </button>
                          <button
                            onClick={() => {
                              setEditingReportId(null);
                              setEditingReportForm(defaultReportForm);
                            }}
                            className="btn-secondary"
                          >
                            <X size={16} aria-hidden="true" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-start 2xl:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-xl font-semibold text-[var(--foreground)]">
                                {report.title}
                              </h3>
                              <span
                                className={`rounded-full px-3 py-1 text-sm font-medium ${statusTone(report.status)}`}
                              >
                                {statusLabel(report.status)}
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-[var(--muted)]">
                              By {report.author_name} on {formatDate(report.updated_at)}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-3">
                            <button
                              onClick={() => {
                                setEditingReportId(report.id);
                                setEditingReportForm({
                                  title: report.title,
                                  queryText: report.query_text,
                                  summary: report.summary ?? "",
                                  status: report.status,
                                  tags: report.tags.join(", "),
                                });
                              }}
                              className="btn-secondary min-h-9 px-3 py-2 text-sm"
                            >
                              <Pencil size={14} aria-hidden="true" />
                              Edit
                            </button>
                            <button
                              onClick={() => requestDeleteReport(report)}
                              className="btn-danger min-h-9 px-3 py-2 text-sm"
                            >
                              <Trash2 size={14} aria-hidden="true" />
                              {busyKey === `delete-report-${report.id}` ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        </div>
                        <p className="mt-4 leading-7 text-[var(--ink-soft)]">{report.query_text}</p>
                        {report.summary ? (
                          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{report.summary}</p>
                        ) : null}
                        <div className="mt-4 flex flex-wrap gap-2">
                          {report.tags.length > 0 ? (
                            report.tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full border border-[var(--border)] bg-[#f6efe4] px-3 py-1 text-xs font-medium uppercase tracking-[0.08em] text-[var(--muted)]"
                              >
                                {tag}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-[var(--muted)]">No tags</span>
                          )}
                        </div>
                      </>
                    )}
                  </article>
                );
              })}
            </div>
            <PaginationControls
              currentPage={safeReportPage}
              pageSize={REPORTS_PAGE_SIZE}
              totalItems={reports.length}
              label="reports"
              onPageChange={setReportPage}
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-panel p-5 sm:p-6">
            <div className="mb-5">
              <p className="eyebrow mb-2">Workspace management</p>
              <h2 className="text-2xl font-semibold text-[var(--foreground)]">
                Create or join workspaces
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Create a new organization as an admin, or use an invite code to join another
                workspace.
              </p>
            </div>

            <div className="grid gap-5">
              <form className="grid gap-3" onSubmit={handleCreateOrganization} noValidate>
                <label className="text-sm font-semibold text-[var(--foreground)]">
                  Create new workspace
                </label>
                <input
                  value={newWorkspaceName}
                  onChange={(event) => setNewWorkspaceName(event.target.value)}
                  className="field"
                  placeholder="Organization name"
                />
                <button
                  type="submit"
                  disabled={busyKey === "create-organization"}
                  className="btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Plus size={16} aria-hidden="true" />
                  {busyKey === "create-organization" ? "Creating..." : "Create workspace"}
                </button>
              </form>

              <div className="h-px bg-[var(--border)]" />

              <form className="grid gap-3" onSubmit={handleJoinOrganization} noValidate>
                <label className="text-sm font-semibold text-[var(--foreground)]">
                  Join with invite code
                </label>
                <input
                  value={joinInviteCode}
                  onChange={(event) => setJoinInviteCode(event.target.value.toUpperCase())}
                  className="field font-mono uppercase tracking-[0.12em]"
                  placeholder="INVITE-CODE"
                />
                <button
                  type="submit"
                  disabled={busyKey === "join-organization"}
                  className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <UserPlus size={16} aria-hidden="true" />
                  {busyKey === "join-organization" ? "Joining..." : "Join workspace"}
                </button>
              </form>
            </div>

            {workspaceNotice ? (
              <div className="mt-5 rounded-[1.2rem] border border-[#b7dfcf] bg-[#edf8f2] px-4 py-3 text-sm font-semibold leading-6 text-[var(--accent-deep)]">
                {workspaceNotice}
              </div>
            ) : null}
          </div>

          <div id="watchlist" className="glass-panel scroll-mt-24 p-5 sm:p-6">
            <div className="mb-5">
              <p className="eyebrow mb-2">Add company</p>
              <h2 className="text-2xl font-semibold text-[var(--foreground)]">Build the watchlist</h2>
            </div>

            <form className="grid gap-4" onSubmit={handleCreateWatchlistItem} noValidate>
              <div className="grid gap-4 md:grid-cols-[0.7fr_1.3fr]">
                <input
                  value={watchlistForm.symbol}
                  onChange={(event) =>
                    setWatchlistForm((current) => ({ ...current, symbol: event.target.value }))
                  }
                  className="field"
                  placeholder="Ticker"
                  required
                />
                <input
                  value={watchlistForm.companyName}
                  onChange={(event) =>
                    setWatchlistForm((current) => ({
                      ...current,
                      companyName: event.target.value,
                    }))
                  }
                  className="field"
                  placeholder="Company name"
                  required
                />
              </div>
              <textarea
                value={watchlistForm.notes}
                onChange={(event) =>
                  setWatchlistForm((current) => ({ ...current, notes: event.target.value }))
                }
                className="field min-h-24"
                placeholder="Coverage notes"
              />
              <button
                type="submit"
                disabled={busyKey === "create-watchlist"}
                className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus size={16} aria-hidden="true" />
                {busyKey === "create-watchlist" ? "Saving..." : "Add to watchlist"}
              </button>
            </form>
          </div>

          <div className="glass-panel p-5 sm:p-6">
            <div className="mb-5">
              <p className="eyebrow mb-2">Coverage list</p>
              <h2 className="text-2xl font-semibold text-[var(--foreground)]">Tracked companies</h2>
            </div>

            <div className="space-y-4">
              {watchlist.length === 0 ? (
                <div className="rounded-[1.6rem] border border-dashed border-[var(--border)] bg-white/45 p-6 text-[var(--muted)]">
                  No companies have been added to this workspace watchlist yet.
                </div>
              ) : null}

              {paginatedWatchlist.map((item) => {
                const isEditing = editingWatchlistId === item.id;
                return (
                  <article
                    key={item.id}
                  className="premium-card rounded-[1.35rem] p-4 transition sm:p-5"
                  >
                    {isEditing ? (
                      <div className="space-y-4">
                        <input
                          value={editingWatchlistForm.companyName}
                          onChange={(event) =>
                            setEditingWatchlistForm((current) => ({
                              ...current,
                              companyName: event.target.value,
                            }))
                          }
                          className="field"
                        />
                        <textarea
                          value={editingWatchlistForm.notes}
                          onChange={(event) =>
                            setEditingWatchlistForm((current) => ({
                              ...current,
                              notes: event.target.value,
                            }))
                          }
                          className="field min-h-20"
                        />
                        <div className="flex flex-wrap gap-3">
                          <button
                            onClick={() => handleUpdateWatchlistItem(item.id)}
                            className="btn-primary"
                          >
                            <Save size={16} aria-hidden="true" />
                            {busyKey === `update-watchlist-${item.id}` ? "Saving..." : "Save changes"}
                          </button>
                          <button
                            onClick={() => {
                              setEditingWatchlistId(null);
                              setEditingWatchlistForm(defaultWatchlistForm);
                            }}
                            className="btn-secondary"
                          >
                            <X size={16} aria-hidden="true" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex items-center gap-3">
                              <span className="rounded-full bg-[#1f1a17] px-3 py-1 text-sm font-semibold text-[#efe5d6]">
                                {item.symbol}
                              </span>
                              <h3 className="text-lg font-semibold text-[var(--foreground)]">
                                {item.company_name}
                              </h3>
                            </div>
                            <p className="mt-2 text-sm text-[var(--muted)]">
                              Added on {formatDate(item.created_at)}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-3">
                            <button
                              onClick={() => {
                                setEditingWatchlistId(item.id);
                                setEditingWatchlistForm({
                                  symbol: item.symbol,
                                  companyName: item.company_name,
                                  notes: item.notes ?? "",
                                });
                              }}
                              className="btn-secondary min-h-9 px-3 py-2 text-sm"
                            >
                              <Pencil size={14} aria-hidden="true" />
                              Edit
                            </button>
                            <button
                              onClick={() => requestDeleteWatchlistItem(item)}
                              className="btn-danger min-h-9 px-3 py-2 text-sm"
                            >
                              <Trash2 size={14} aria-hidden="true" />
                              {busyKey === `delete-watchlist-${item.id}` ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        </div>
                        {item.notes ? (
                          <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{item.notes}</p>
                        ) : (
                          <p className="mt-4 text-sm leading-6 text-[var(--muted)]">No notes added yet.</p>
                        )}
                      </>
                    )}
                  </article>
                );
              })}
            </div>
            <PaginationControls
              currentPage={safeWatchlistPage}
              pageSize={WATCHLIST_PAGE_SIZE}
              totalItems={watchlist.length}
              label="companies"
              onPageChange={setWatchlistPage}
            />
          </div>

          {isCurrentUserAdmin ? (
            <div className="glass-panel p-5 sm:p-6">
              <div className="mb-5 flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#e8f2ee] text-[var(--accent-strong)]">
                  <UserPlus size={18} aria-hidden="true" />
                </div>
                <div>
                  <p className="eyebrow mb-2">Admin access</p>
                  <h2 className="text-2xl font-semibold text-[var(--foreground)]">
                    Invite teammates
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    Generate a role-based invite code and share it with analysts who should join
                    this workspace.
                  </p>
                </div>
              </div>

              <form className="grid gap-4" onSubmit={handleCreateInvite} noValidate>
                <input
                  value={inviteForm.email}
                  onChange={(event) =>
                    setInviteForm((current) => ({ ...current, email: event.target.value }))
                  }
                  className="field"
                  placeholder="Invitee email (optional)"
                  type="email"
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <select
                    value={inviteForm.role}
                    onChange={(event) =>
                      setInviteForm((current) => ({
                        ...current,
                        role: event.target.value as MembershipRole,
                      }))
                    }
                    className="field"
                  >
                    <option value="analyst">Analyst</option>
                    <option value="admin">Admin</option>
                  </select>
                  <input
                    value={inviteForm.expiresInDays}
                    onChange={(event) =>
                      setInviteForm((current) => ({
                        ...current,
                        expiresInDays: event.target.value,
                      }))
                    }
                    className="field"
                    inputMode="numeric"
                    max={30}
                    min={1}
                    placeholder="Expires in days"
                    type="number"
                  />
                </div>
                <button
                  type="submit"
                  disabled={busyKey === "create-invite"}
                  className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <UserPlus size={16} aria-hidden="true" />
                  {busyKey === "create-invite" ? "Creating..." : "Create invite code"}
                </button>
              </form>

              {lastInvite ? (
                <div className="mt-5 rounded-[1.35rem] border border-[var(--border-strong)] bg-[#f7fbf9] p-4">
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    Share this invite code
                  </p>
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <code className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-lg font-black tracking-[0.16em] text-[var(--accent-deep)]">
                      {lastInvite.code}
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        void copyInviteCode();
                      }}
                      className="btn-secondary min-h-11"
                    >
                      <Copy size={16} aria-hidden="true" />
                      {inviteCopied ? "Copied" : "Copy code"}
                    </button>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                    Role: <span className="font-semibold capitalize">{lastInvite.role}</span>
                    {lastInvite.email ? `, reserved for ${lastInvite.email}` : ", open to any signed-in user with the code"}.
                    Expires on {formatDate(lastInvite.expires_at)}.
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="glass-panel p-5 sm:p-6">
            <div className="mb-5">
              <p className="eyebrow mb-2">Accessible workspaces</p>
              <h2 className="text-2xl font-semibold text-[var(--foreground)]">Your organizations</h2>
            </div>
            <div className="space-y-3">
              {paginatedMemberships.map((membership) => (
                <article
                  key={membership.id}
                  className="premium-card rounded-[1.5rem] p-4 transition"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-[var(--foreground)]">
                        {membership.organization_name}
                      </h3>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        Slug: {membership.organization_slug}
                      </p>
                    </div>
                    <span className="rounded-full bg-[#e8f2ee] px-3 py-1 text-sm font-medium capitalize text-[var(--accent-strong)]">
                      {membership.role}
                    </span>
                  </div>
                </article>
              ))}
            </div>
            <PaginationControls
              currentPage={safeOrganizationPage}
              pageSize={ORGANIZATIONS_PAGE_SIZE}
              totalItems={memberships.length}
              label="workspaces"
              onPageChange={setOrganizationPage}
            />
          </div>
        </div>
      </section>
      <FloatingAgentLauncher
        isRunning={busyKey === "run-research"}
        result={researchResult}
        onOpenResearchWorkspace={(nextQuery) => {
          const params = nextQuery?.trim()
            ? `?query=${encodeURIComponent(nextQuery.trim())}`
            : "";
          window.location.href = `/research${params}`;
        }}
        onSubmitQuery={runResearchQuery}
      />
      </main>
    </>
  );
}
