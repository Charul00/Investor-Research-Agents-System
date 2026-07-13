# AI Researcher Technical Decisions

## Product Approach

AI Researcher combines full-stack workflows, external data integrations, source attribution, saved reports, watchlists, and structured AI synthesis. The AI feature sits inside a real analyst workspace with authentication, persistence, tenant isolation, and reusable outputs.

## Tech Stack Decision

I used **FastAPI + PostgreSQL + Next.js**.

FastAPI was chosen because it gives strong request validation, typed response models, clean REST endpoints, and quick iteration speed. PostgreSQL was chosen because the domain is relational: users belong to organizations, organizations own reports/watchlists/invites, and audit events need durable tenant-scoped storage. Next.js was chosen for a polished product UI, protected dashboard routing, modern React components, and straightforward deployment to Vercel.

Alternatives considered:

- MERN: fast for CRUD, but relational tenant boundaries are cleaner in PostgreSQL.
- Django + React: strong batteries-included backend, but FastAPI gave faster API iteration for this build.
- Supabase: excellent for auth/database speed, but implementing auth/tenant middleware directly keeps the architecture easier to maintain.
- Pinecone/Chroma/pgvector: useful alternatives, but Qdrant provides a managed vector database path while the local index improves development resilience.

## Multi-Tenancy Decision

I used a shared-database, shared-schema pattern with `organization_id` columns on tenant-owned tables.

Every protected tenant request includes:

- `Authorization: Bearer <access_token>`
- `X-Organization-Id: <organization_id>`

The backend resolves the current user from the JWT, then checks `memberships` for an active membership in the requested organization. Routes receive that membership context and filter database queries by `membership.organization_id`.

This pattern is simple, easy to reason about, and appropriate for the current product requirements. It demonstrates the key production concept: tenant isolation is enforced server-side, not trusted from the frontend. A schema-per-tenant design would add operational complexity without improving the core workflow.

## RBAC Decision

The app supports two roles:

- `admin`: organization management and invite creation.
- `analyst`: research/report/watchlist workflows inside the assigned organization.

I implemented role checks with a FastAPI dependency (`require_roles`) so admin-only endpoints are enforced at the API layer. The frontend can hide or show actions for UX, but the backend remains the source of truth.

## AI Integration Decision

The AI flow is designed as an orchestrated research feature, not a chat wrapper.

The backend does the following:

1. Extracts ticker symbols and query intent.
2. Builds a deterministic fallback plan.
3. Uses OpenAI to refine the plan when an API key is available.
4. Applies explicit user constraints, such as "only news" or "only stock price."
5. Runs selected tools in parallel where possible.
6. Builds deterministic insights from evidence.
7. Uses OpenAI for a plain-English, source-grounded summary.
8. Returns structured JSON for the frontend to render.

Prompt choices:

- Planner prompt returns compact JSON with allowed tools only.
- Synthesis prompt instructs the model to use only provided evidence.
- Synthesis prompt forbids markdown, bold text, and bullets so the UI stays clean and user-friendly.
- Backend sanitization removes markdown artifacts as a final guardrail.

## Data Tool Decisions

For market data, I use a provider chain: Twelve Data first for quotes/time series, Alpha Vantage for quotes, history, and company overview fundamentals, then Stooq/Yahoo fallback if a free-tier provider is slow or rate-limited.

For news, I used Yahoo Finance RSS-style feeds plus a simple keyword sentiment classifier. This keeps the demo free-tier friendly while still proving external retrieval, sentiment classification, recency, and source attribution.

For RAG, I use Qdrant with deterministic document vectors when configured. The local chunk index remains as a reliability fallback, and SEC EDGAR companyfacts add live filing-backed financial evidence.

## Product UX Decisions

The dashboard is designed to feel like a real analyst workspace from day one:

- Floating AI mini chat for quick questions.
- Dedicated Research Studio page for structured charts, source register, saved history, and saving reports.
- Toast errors instead of inline technical failures.
- Pagination, filtering, loading states, empty states, and responsive layouts.
- English-only application copy for a professional product experience.

## Trade-Offs Made

The biggest trade-off is balancing realtime external services with development reliability. Qdrant, SEC, Twelve Data, Alpha Vantage, and Upstash improve realism, while local/public fallbacks keep the app usable if a free-tier service throttles.

Another trade-off is free-tier market data latency and rate limits. In production, I would upgrade to a paid market data provider with exchange entitlements and SLAs.

I also chose live status animation instead of SSE/token streaming. The UI communicates progress and the backend fetches data at request time, but the response itself arrives as one structured payload.

## Hardest Part

The hardest part was making tool orchestration feel dynamic and trustworthy. A naive implementation could call every tool for every query, but that fails the product workflow and increases latency. I solved this with a hybrid planner:

- deterministic keyword/symbol rules for reliability;
- OpenAI planner refinement for flexible natural language;
- explicit constraint guardrails for phrases like "only stock price" or "do not analyze stock";
- structured response validation through Pydantic.

This made the agent more predictable while still benefiting from LLM flexibility.

## What I Would Improve With Two More Weeks

- Add SSE streaming for planner/tool/synthesis events.
- Add a real document ingestion UI for Qdrant and per-organization vector namespaces.
- Add richer SEC filing retrieval, earnings transcripts, and paid market fundamentals.
- Add integration tests for tenant isolation and AI tool planning.
- Add CI/CD with lint, test, build, and migration checks.
- Add PDF/CSV export for saved research reports.
- Add observability: structured logs, request tracing, and external API latency metrics.
- Deploy to Vercel + Render or AWS App Runner/RDS with production secrets and health monitoring.

## Current Known Limitations

- Free-tier market/news APIs may be rate-limited, delayed, or change response formats.
- SEC companyfacts provide structured filing evidence, but not full filing narrative sections yet.
- RAG corpus is intentionally small and sample-based, with Qdrant used for semantic retrieval when configured.
- AI output is source-grounded but still needs analyst review before investment decisions.
- Realtime means request-time data fetching and live UI status, not token-by-token streaming yet.
