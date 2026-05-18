# Klypup Research OS

AI-powered investment research dashboard for the Klypup Applied AI Intern technical assessment.

## Option Chosen

I chose **Option A: Investment Research Dashboard** because it best demonstrates applied AI inside a real product workflow: authenticated workspaces, tenant-isolated saved research, watchlists, external market/news tools, a RAG-style document index, and OpenAI synthesis rendered as structured UI instead of a chatbot-only answer.

## Product Summary

Klypup Research OS lets analysts ask natural-language market questions such as:

> Show only NVIDIA latest stock price, volume, P/E, revenue, EPS, and recent price performance.

The backend plans which tools are needed, fetches evidence from market/news/RAG sources, synthesizes a concise OpenAI summary, and returns structured cards, tables, charts, sentiment badges, and source references. Users can save reports, search/filter history, manage a watchlist, and switch between isolated organizations.

## Tech Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS | Fast full-stack UI, strong component model, Vercel-ready deployment |
| Backend | FastAPI, SQLAlchemy 2, Pydantic | Clean REST APIs, typed schemas, strong validation and error handling |
| Database | PostgreSQL | Persistent relational model for users, organizations, reports, watchlists, invites, audit logs |
| Auth | JWT access + refresh tokens | Simple production-style auth with protected routes and refresh handling |
| AI | OpenAI Responses API | Planning support and concise source-grounded synthesis |
| Data Tools | Twelve Data, Alpha Vantage, SEC EDGAR, Yahoo Finance RSS, Qdrant, Upstash Redis | Real provider chain with cache-first low latency and graceful degradation |
| Deployment Target | Vercel frontend + Render backend/database | Free-tier friendly; AWS migration is documented as a future improvement |

## Core Features

- Working signup, login, logout, JWT refresh, protected routes.
- Organization-aware workspaces with `X-Organization-Id` tenant context.
- RBAC with Admin and Analyst roles.
- Saved research CRUD with tags, search, status filter, pagination, and audit logs.
- Company watchlist CRUD with duplicate prevention and pagination.
- AI research endpoint that dynamically chooses market, news, RAG, and OpenAI synthesis tools.
- Mini AI chat launcher with live status animation and a dedicated Research Studio page.
- Structured result UI: company cards, mini price charts, sentiment sections, RAG snippets, source register.
- Source attribution for market quotes, news articles, local knowledge-base snippets, and OpenAI synthesis.
- Responsive dashboard, loading states, empty states, toast errors, and user-friendly validation messages.

## Screenshots

Screenshots are stored in `docs/screenshots/`.

| Screen | File |
| --- | --- |
| Landing page | `docs/screenshots/01-landing.png` |
| Login | `docs/screenshots/02-login.png` |
| Dashboard | `docs/screenshots/03-dashboard.png` |
| Mini AI chat | `docs/screenshots/04-mini-chat.png` |
| Research Studio | `docs/screenshots/05-research-studio.png` |
| Reports/watchlist workspace | `docs/screenshots/06-workspace-data.png` |

## Architecture Documents

- `ARCHITECTURE.md`: system architecture, data flow, ERD, AI orchestration, multi-tenant flow, and API design.
- `DECISIONS.md`: option choice, tech stack rationale, multi-tenancy, AI design, trade-offs, and improvements.
- `docs/diagrams/klypup-architecture.excalidraw`: editable Excalidraw board with all required architecture diagrams.

## Local Setup

### Prerequisites

- Node.js 20+
- Python 3.12+
- PostgreSQL 14+ locally, or Docker if available
- OpenAI API key

### 1. Clone and configure environment

```bash
cp .env.example backend/.env
```

Edit `backend/.env` and set:

```bash
OPENAI_API_KEY=your_openai_key
SECRET_KEY=replace-with-a-long-random-secret
DATABASE_URL=postgresql+psycopg://klypup:klypup@localhost:5432/klypup_research
TWELVE_DATA_API_KEY=your_twelve_data_key
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key
SEC_USER_AGENT=KlypupResearchOS/1.0 your-email@example.com
QDRANT_URL=https://your-cluster-url.qdrant.io:6333
QDRANT_API_KEY=your_qdrant_api_key
UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_token
```

Create `frontend/.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
```

### 2. Start PostgreSQL

If Docker is installed:

```bash
docker compose up -d postgres
```

If Docker is not installed, use local PostgreSQL:

```bash
createdb klypup_research
psql postgres -c "CREATE USER klypup WITH PASSWORD 'klypup';"
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE klypup_research TO klypup;"
```

If the database already exists, only confirm the connection string in `backend/.env`.

### 3. Install and run backend

```bash
cd backend
uv sync
uv run alembic upgrade head
uv run python -m app.scripts.seed_demo
uv run uvicorn app.main:app --reload
```

Backend health check:

```bash
curl http://localhost:8000/api/v1/health
```

Expected response:

```json
{"status":"ok"}
```

### 4. Install and run frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

## Demo Accounts

All demo accounts use:

```text
DemoPass123
```

| Email | Role | Organization |
| --- | --- | --- |
| `admin@northstar.com` | Admin | Northstar Capital |
| `analyst@northstar.com` | Analyst | Northstar Capital |
| `associate@northstar.com` | Analyst | Northstar Capital |
| `pm@northstar.com` | Admin | Northstar Capital |
| `admin@eastbridge.com` | Admin | Eastbridge Research |
| `analyst@eastbridge.com` | Analyst | Eastbridge Research |
| `intern@eastbridge.com` | Analyst | Eastbridge Research |
| `admin@helios.com` | Admin | Helios Asset Management |
| `analyst@helios.com` | Analyst | Helios Asset Management |
| `admin@cedarridge.com` | Admin | Cedar Ridge Partners |
| `analyst@cedarridge.com` | Analyst | Cedar Ridge Partners |
| `multi@klypup.demo` | Analyst | Northstar Capital + Eastbridge Research |

## Demo Workflows

For a complete presentation outline, see `docs/DEMO_SCRIPT.md`.

1. **Core AI research**
   - Log in as `admin@northstar.com`.
   - Open the floating AI chat bubble.
   - Ask: `Show only NVIDIA latest stock price, volume, P/E, revenue, EPS, and recent price performance.`
   - Confirm the result uses `market_data + llm_synthesis`, shows market cards, and cites market/API sources.

2. **Dynamic tool selection**
   - Ask: `Summarize only the recent news sentiment for Tesla. Do not analyze stock price.`
   - Confirm the response uses news sentiment and does not fetch market cards.

3. **RAG-style document evidence**
   - Ask: `Analyze NVIDIA earnings report details from filings. Focus on data center growth, AI GPU demand, export controls, and competition.`
   - Confirm document snippets and knowledge-base sources are displayed.

4. **Multi-tenant isolation**
   - Log in as `admin@northstar.com` and note saved reports/watchlist.
   - Log out and log in as `admin@eastbridge.com`.
   - Confirm Eastbridge has separate reports/watchlist and cannot access Northstar records.

5. **Role-based access**
   - Use Admin to create organization invites.
   - Use Analyst to work with reports/watchlists while admin-only workspace actions remain restricted.

## AI Tool Orchestration

The AI layer is not a prompt-in/text-out wrapper. The backend:

1. Extracts ticker symbols and reads intent.
2. Uses an OpenAI-assisted planner plus deterministic guardrails.
3. Selects only relevant tools:
   - `market_data` for Twelve Data/Alpha Vantage quotes, volume, metrics, and historical chart data.
   - `news_sentiment` for recent news retrieval and sentiment classification.
   - `document_kb` for Qdrant semantic search plus SEC EDGAR company facts and local RAG fallback.
   - `llm_synthesis` for source-grounded executive summary.
4. Runs selected tools concurrently where possible.
5. Returns structured JSON rendered by the frontend.

## Verification Commands

Backend:

```bash
cd backend
python3 -m compileall app
./.venv/bin/ruff check app
```

Frontend:

```bash
cd frontend
npm run lint
npm run build
```

Realtime API smoke test:

```bash
curl -X POST http://localhost:8000/api/v1/research \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "X-Organization-Id: <ORG_ID>" \
  -d '{"query":"Show only NVIDIA latest stock price, volume, P/E, revenue, EPS, and recent price performance."}'
```

## Deployment Notes

Recommended free-tier path:

- Frontend: Vercel
- Backend: Render Web Service
- Database: Render PostgreSQL

Set these production environment variables:

- `NEXT_PUBLIC_API_BASE_URL`
- `DATABASE_URL`
- `SECRET_KEY`
- `OPENAI_API_KEY`
- `TWELVE_DATA_API_KEY`
- `ALPHA_VANTAGE_API_KEY`
- `SEC_USER_AGENT`
- `QDRANT_URL`
- `QDRANT_API_KEY`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `FRONTEND_URL`
- `CORS_ORIGINS`

## Known Limitations

- Free-tier market/news APIs can still have rate limits, provider delays, or delayed exchange data.
- Qdrant is used when configured; if it is unavailable, the backend falls back to the local RAG index.
- The app has live status updates and realtime external data fetching, but not token-level SSE streaming yet.
- Docker Compose currently provisions PostgreSQL only; frontend/backend still run as local dev processes.
- Deployment is designed for Vercel + Render, but live URLs are optional for this assessment.
