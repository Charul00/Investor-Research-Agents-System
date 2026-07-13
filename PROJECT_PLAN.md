# AI Researcher Project Plan

## Project
AI-powered Investment Research Dashboard

## Goal
Build a multi-tenant full-stack web app where analysts can submit natural-language research queries and get structured, source-attributed research results with charts, tables, sentiment, and filing-backed insights.

## Recommended Stack
- Frontend: Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Recharts
- Backend: FastAPI, Python 3.12, Pydantic, SQLAlchemy
- Auth: JWT with refresh tokens
- Database: PostgreSQL
- AI Orchestration: LangGraph
- Embeddings / LLM: OpenAI (`text-embedding-3-small`, `gpt-4.1-mini`) or equivalent
- Vector DB: Qdrant Cloud free tier
- Cache: Redis / Upstash
- Deployment: Vercel for frontend, Render for backend API

## Architecture Style
Hybrid architecture:
- Deterministic app shell for auth, CRUD, tenancy, and APIs
- Agentic AI layer for dynamic tool planning and orchestration
- RAG layer for filings, earnings materials, and company documents
- Streaming UI for real-time user feedback

## External Data Strategy
1. Market data:
- Twelve Data for latest prices, volume, and historical charts

2. News and sentiment:
- Alpha Vantage `NEWS_SENTIMENT` for financial news retrieval and sentiment metadata

3. Financial facts and filings:
- SEC EDGAR APIs for submissions and company facts

4. Document knowledge base:
- Pre-ingested 10-K, 10-Q, earnings call transcripts, and selected company reports in Qdrant

## Core LangGraph Flow
1. Query parser
2. Symbol resolver
3. Planner node
4. Parallel tool execution
5. Retrieval node for filings / transcripts
6. Evidence ranking and citation normalization
7. Structured synthesis node
8. Validation / fallback node
9. Persist report and return stream

## Minimum Features
- Signup, login, logout
- Organization creation and invite code join flow
- Roles: Admin, Analyst
- Dashboard home
- New research query flow
- Structured report result page
- Report save, edit title/tags, search, delete
- Recent history
- Company watchlist
- Tenant-scoped access on every backend query

## Data Model
- organizations
- users
- memberships
- reports
- report_sections
- saved_companies
- document_chunks
- audit_logs
- invites

## API Surface
- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /me`
- `POST /orgs`
- `POST /orgs/join`
- `GET /dashboard`
- `POST /research/query`
- `GET /reports`
- `GET /reports/{id}`
- `PATCH /reports/{id}`
- `DELETE /reports/{id}`
- `POST /watchlist`
- `DELETE /watchlist/{symbol}`

## Low-Latency Rules
- Keep LangGraph graph shallow
- Use async parallel tool calls
- Cache price, news, and filing lookups
- Retrieve only top-k document chunks
- Stream partial progress to the UI
- Precompute embeddings during ingestion, never at query time
- Use structured JSON outputs to avoid reparsing loops

## Reliability Rules
- Every tool has timeout, retry, and fallback behavior
- If one source fails, return partial report with source-status badges
- Validate tenant context in middleware before controller logic
- Save raw tool outputs for debugging and replay
- Add rate-limit guards around external providers

## Delivery Plan

### Day 1
- Finalize architecture
- Scaffold frontend and backend
- Set up database schema
- Implement auth and tenant middleware

### Day 2
- Build dashboard, protected routes, and org flows
- Implement report CRUD and watchlist
- Seed sample users, orgs, and reports

### Day 3
- Implement data tools for market, news, and SEC facts
- Build ingestion pipeline for filings / transcripts
- Store embeddings in Qdrant

### Day 4
- Build LangGraph orchestration
- Add structured response schema
- Build research result UI with charts, cards, tables, and citations
- Add SSE streaming

### Day 5
- Testing, cleanup, README, ARCHITECTURE.md, and DECISIONS.md
- Deploy frontend to Vercel and backend to Render
- Rehearse live demo with 2 orgs and 2 roles

## Important Constraint
Do not promise "error free". Build for graceful degradation, observable failures, and clear user feedback instead.

## Acceptance Scenarios
1. Analyst creates a research query and gets a structured report
2. Admin in Org A sees only Org A data
3. User in Org B cannot access Org A reports
4. Admin manages workspace while Analyst has limited permissions
