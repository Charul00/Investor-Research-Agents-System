# Investment Research API

FastAPI backend for the investment research dashboard.

## Local database

The backend is now PostgreSQL-first.

1. Copy the root env file:
   `cp ../.env.example .env`
2. Start Postgres from the repo root:
   `docker compose up -d postgres`
3. Run migrations:
   `uv run alembic upgrade head`
4. Seed demo data:
   `uv run python -m app.scripts.seed_demo`
5. Add your OpenAI key in `backend/.env`:
   `OPENAI_API_KEY=your_openai_api_key`
6. For best realtime results, also add:
   `TWELVE_DATA_API_KEY`, `ALPHA_VANTAGE_API_KEY`, `SEC_USER_AGENT`, `QDRANT_URL`,
   `QDRANT_API_KEY`, `UPSTASH_REDIS_REST_URL`, and `UPSTASH_REDIS_REST_TOKEN`.
7. Start the API:
   `uv run uvicorn app.main:app --reload`

AI research uses OpenAI for planning and synthesis. Market data now prefers Twelve Data, Alpha
Vantage, SEC EDGAR, Qdrant, and Upstash cache when configured, while the dashboard still stays
usable if an external provider is temporarily slow.

## Demo accounts

- `admin@northstar.com` / `DemoPass123`
- `analyst@northstar.com` / `DemoPass123`
- `associate@northstar.com` / `DemoPass123`
- `pm@northstar.com` / `DemoPass123`
- `admin@eastbridge.com` / `DemoPass123`
- `analyst@eastbridge.com` / `DemoPass123`
- `intern@eastbridge.com` / `DemoPass123`
- `admin@helios.com` / `DemoPass123`
- `analyst@helios.com` / `DemoPass123`
- `admin@cedarridge.com` / `DemoPass123`
- `analyst@cedarridge.com` / `DemoPass123`
- `multi@research.demo` / `DemoPass123`
