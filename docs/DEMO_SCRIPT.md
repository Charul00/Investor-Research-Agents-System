# Demo Script

## 15-Minute Walkthrough

### 1. Product Context

Klypup Research OS is an AI-powered investment research dashboard for analysts. The goal is to reduce manual research time by combining market data, recent news sentiment, document evidence, and OpenAI synthesis inside a real authenticated workspace.

Key point: AI is a feature inside the product, not the entire product.

### 2. Architecture Overview

Walk through the diagram in `ARCHITECTURE.md`.

Mention:

- Next.js frontend calls FastAPI only.
- FastAPI resolves the current user and organization.
- PostgreSQL stores users, organizations, reports, watchlists, invites, and audit logs.
- The research orchestrator dynamically selects market, news, Qdrant/SEC RAG, and OpenAI synthesis tools.
- Every response is structured JSON, rendered as UI components.

### 3. Multi-Tenancy

Explain:

- Users can belong to multiple organizations.
- Requests include `X-Organization-Id`.
- Backend validates active membership before every tenant-owned query.
- Reports/watchlists are always filtered by `organization_id`.

### 4. AI Orchestration

Explain:

- Planner extracts symbols and intent.
- Deterministic rules provide reliability.
- OpenAI refines the plan when available.
- Explicit constraints are enforced, such as "only stock price" or "do not analyze stock."
- Selected tools run concurrently.
- OpenAI summary is source-grounded and sanitized for clean UI output.

### 5. Code Quality

Mention:

- Pydantic validation.
- Consistent error envelope.
- Toast errors in frontend.
- JWT refresh handling.
- Pagination and responsive UI.
- Audit logs for report/watchlist mutations.

## 15-Minute Live Demo

### Workflow 1: Core AI Research

Login:

```text
admin@northstar.com
DemoPass123
```

Open the floating AI chat and ask:

```text
Show only NVIDIA latest stock price, volume, P/E, revenue, EPS, and recent price performance.
```

Expected:

- Mini chat returns a concise plain-English answer.
- Research Studio shows company card, price chart, metrics, tools used, and source register.
- Tools should include `market_data` and `llm_synthesis`.
- News and document sections should not appear for this market-only query.

### Workflow 2: Dynamic News-Only Tool Selection

Ask:

```text
Summarize only the recent news sentiment for Tesla. Do not analyze stock price.
```

Expected:

- Tools should include `news_sentiment` and `llm_synthesis`.
- Market cards should not appear.
- News sentiment badges and source references should appear.

### Workflow 3: RAG Evidence

Ask:

```text
Analyze NVIDIA earnings report details from filings. Focus on data center growth, AI GPU demand, export controls, and competition.
```

Expected:

- Document snippets from Qdrant/SEC appear when configured, with local RAG fallback if a provider is unavailable.
- Knowledge-base source references appear.
- The response mentions only evidence available in retrieved snippets.

### Workflow 4: Saved Research CRUD

In Research Studio:

1. Click `Save this as report`.
2. Search for the saved report.
3. Edit report status/tags.
4. Delete a test report if needed.

Expected:

- Toasts show success/error states.
- Reports update without leaking other organizations' data.

### Workflow 5: Multi-Tenant Isolation

Logout and login:

```text
admin@eastbridge.com
DemoPass123
```

Expected:

- Eastbridge Research has separate saved reports and watchlist items.
- Northstar data is not visible.

## 10-Minute Q&A Prep

### Why not call OpenAI directly from the browser?

Because API keys must stay server-side. The backend also enforces tenant isolation, validates inputs, handles timeouts, and returns structured output.

### How is tenant isolation enforced?

The backend validates the JWT, reads `X-Organization-Id`, checks active membership, and scopes all tenant-owned queries by `organization_id`.

### What makes this agentic?

The system plans tools based on user intent, runs selected tools, aggregates evidence, and synthesizes a structured answer. It does not call every tool for every query.

### What is realtime?

Market and news data are fetched at request time from external sources, and the UI shows live status while tools run. Token-level streaming is a future improvement.

### What would be improved in production?

Use a paid market data provider, deeper SEC filing ingestion, organization-scoped vector collections, SSE streaming, integration tests, deployment observability, and CI/CD.
