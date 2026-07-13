export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export type MembershipRole = "admin" | "analyst";

export type MembershipSummary = {
  id: string;
  organization_id: string;
  organization_name: string;
  organization_slug: string;
  role: MembershipRole;
  joined_at: string;
};

export type UserSummary = {
  id: string;
  full_name: string;
  email: string;
};

export type AuthSession = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: UserSummary;
  memberships: MembershipSummary[];
  active_membership: MembershipSummary;
};

export type ReportStatus = "draft" | "complete" | "failed";

export type Report = {
  id: string;
  organization_id: string;
  author_id: string;
  author_name: string;
  title: string;
  query_text: string;
  summary: string | null;
  status: ReportStatus;
  tags: string[];
  created_at: string;
  updated_at: string;
};

export type WatchlistItem = {
  id: string;
  organization_id: string;
  added_by_user_id: string;
  symbol: string;
  company_name: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ResearchTool =
  | "market_data"
  | "news_sentiment"
  | "document_kb"
  | "llm_synthesis";

export type SourceType =
  | "market_api"
  | "news_article"
  | "knowledge_base"
  | "ai_synthesis";

export type SourceReference = {
  id: string;
  title: string;
  type: SourceType;
  url: string | null;
  published_at: string | null;
  provider: string;
};

export type ResearchPlan = {
  symbols: string[];
  tools: ResearchTool[];
  rationale: string;
};

export type PricePoint = {
  date: string;
  close: number;
  source_id: string;
};

export type CompanyMetric = {
  symbol: string;
  company_name: string;
  price: number;
  change_percent: number;
  volume: number;
  market_cap: string;
  pe_ratio: number | null;
  revenue: string | null;
  eps: number | null;
  source_id: string;
  historical_prices: PricePoint[];
};

export type NewsItem = {
  symbol: string;
  title: string;
  summary: string;
  url: string | null;
  published_at: string;
  sentiment: "positive" | "neutral" | "negative" | string;
  source_id: string;
};

export type DocumentSnippet = {
  symbol: string;
  company: string;
  title: string;
  excerpt: string;
  score: number;
  source_id: string;
};

export type Insight = {
  section: string;
  title: string;
  body: string;
  confidence: number;
  source_ids: string[];
};

export type ResearchResponse = {
  query: string;
  generated_at: string;
  latency_ms: number;
  plan: ResearchPlan;
  executive_summary: string;
  companies: CompanyMetric[];
  news: NewsItem[];
  documents: DocumentSnippet[];
  insights: Insight[];
  sources: SourceReference[];
};

export type DashboardResponse = {
  workspace: MembershipSummary;
  stats: {
    saved_reports: number;
    completed_reports: number;
    watchlist_items: number;
    active_members: number;
  };
  recent_reports: Report[];
  watchlist: WatchlistItem[];
};

export type MeResponse = {
  user: UserSummary;
  memberships: MembershipSummary[];
};

type ApiErrorPayload = {
  error?: {
    code?: string;
    message?: string;
    status?: number;
    request_id?: string;
    path?: string;
    details?: Array<{
      field?: string;
      message?: string;
      type?: string;
    }>;
  };
  detail?: string;
};

type ApiErrorDetail = NonNullable<NonNullable<ApiErrorPayload["error"]>["details"]>[number];

function titleCase(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatFieldName(field?: string) {
  const rawField = field?.split(".").at(-1);
  if (!rawField) {
    return null;
  }

  const labels: Record<string, string> = {
    code: "Invite code",
    company_name: "Company name",
    email: "Email",
    expires_in_days: "Invite expiry",
    full_name: "Full name",
    organization_name: "Organization name",
    password: "Password",
    query_text: "Research query",
    status: "Status",
    summary: "Summary",
    symbol: "Ticker",
    tags: "Tags",
    title: "Report title",
  };

  return labels[rawField] ?? titleCase(rawField);
}

function friendlyValidationMessage(detail: ApiErrorDetail) {
  const fieldLabel = formatFieldName(detail.field);
  const rawMessage = detail.message ?? "Please check this value.";
  const minimum = rawMessage.match(/at least (\d+) character/);
  const maximum = rawMessage.match(/at most (\d+) character/);

  let message = rawMessage;
  if (detail.type === "missing") {
    message = "This field is required.";
  } else if (rawMessage.toLowerCase().includes("valid email")) {
    message = "Please enter a valid email address.";
  } else if (minimum) {
    message = `Please enter at least ${minimum[1]} characters.`;
  } else if (maximum) {
    message = `Please keep this under ${maximum[1]} characters.`;
  } else if (rawMessage.startsWith("Input should be")) {
    message = "Please choose a valid option.";
  } else {
    message = rawMessage
      .replace(/^String should have /, "Please enter ")
      .replace(/^Value error, /, "");
  }

  return fieldLabel ? `${fieldLabel}: ${message}` : message;
}

function formatApiError(payload: ApiErrorPayload | null, response: Response) {
  if (
    response.status === 401 &&
    payload?.error?.code &&
    ["invalid_authentication_token", "invalid_access_token", "user_unavailable"].includes(
      payload.error.code,
    )
  ) {
    return "Your session expired. Please sign in again.";
  }

  const firstDetail = payload?.error?.details?.find((detail) => detail.message);
  if (firstDetail?.message) {
    return friendlyValidationMessage(firstDetail);
  }

  return (
    payload?.error?.message ?? payload?.detail ?? `Request failed with ${response.status}.`
  );
}

export const SESSION_STORAGE_KEY = "investment.research.session";
export const SESSION_CHANGED_EVENT = "investment.research.session.changed";

function notifySessionChanged() {
  window.dispatchEvent(new Event(SESSION_CHANGED_EVENT));
}

export function saveSession(session: AuthSession) {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  notifySessionChanged();
}

export function readSession(): AuthSession | null {
  const raw = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_STORAGE_KEY);
  notifySessionChanged();
}

export function setActiveMembership(organizationId: string): AuthSession | null {
  const session = readSession();
  if (!session) {
    return null;
  }

  const nextMembership = session.memberships.find(
    (membership) => membership.organization_id === organizationId,
  );
  if (!nextMembership) {
    return session;
  }

  const nextSession = { ...session, active_membership: nextMembership };
  saveSession(nextSession);
  return nextSession;
}

async function refreshSession(session: AuthSession): Promise<AuthSession | null> {
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      refresh_token: session.refresh_token,
      organization_id: session.active_membership.organization_id,
    }),
  }).catch(() => null);

  if (!response?.ok) {
    clearSession();
    return null;
  }

  const nextSession = (await response.json()) as AuthSession;
  saveSession(nextSession);
  return nextSession;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  session?: AuthSession | null,
  hasRetriedAuth = false,
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }

  if (session?.active_membership?.organization_id) {
    headers.set("X-Organization-Id", session.active_membership.organization_id);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error("Failed to fetch. Please make sure the API server is running.");
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiErrorPayload | null;

    if (response.status === 401 && session?.refresh_token && !hasRetriedAuth) {
      const refreshedSession = await refreshSession(session);
      if (refreshedSession) {
        return apiFetch<T>(path, options, refreshedSession, true);
      }
    }

    throw new Error(formatApiError(payload, response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
