import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 text-[var(--ink-soft)] sm:px-6 md:px-10">
      <header className="mb-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--foreground)] text-lg font-semibold text-white">
            KR
          </div>
          <div>
            <p className="eyebrow mb-1">Klypup Research OS</p>
            <p className="text-sm text-[var(--muted)]">
              Investment intelligence for modern analyst teams
            </p>
          </div>
        </div>
        <nav className="flex flex-wrap items-center gap-2 text-sm text-[var(--muted)] md:gap-3">
          <span className="rounded-full border border-[var(--border)] bg-white/55 px-4 py-2">
            Source-attributed outputs
          </span>
          <span className="rounded-full border border-[var(--border)] bg-white/55 px-4 py-2">
            Multi-tenant workspaces
          </span>
          <span className="rounded-full border border-[var(--border)] bg-white/55 px-4 py-2">
            Filings plus market data
          </span>
        </nav>
      </header>

      <section className="grid items-stretch gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="glass-panel p-5 sm:p-8 md:p-10">
          <p className="eyebrow mb-3">Klypup Research OS</p>
          <h1 className="max-w-3xl text-3xl font-semibold leading-tight text-[var(--foreground)] sm:text-4xl lg:text-6xl">
            Research earnings, filings, headlines, and market moves in one workspace.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-[var(--muted)] md:text-xl md:leading-8">
            Turn open-ended company questions into structured, cited research briefs with price
            context, recent news sentiment, and filing-backed evidence.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="btn-secondary px-6"
            >
              Create workspace
            </Link>
            <Link
              href="/login"
              className="btn-primary px-6"
            >
              Sign in
            </Link>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              { value: "3x", label: "faster initial research" },
              { value: "100%", label: "workspace-level isolation" },
              { value: "1", label: "shared research surface" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-[1.8rem] border border-[var(--border)] bg-white/55 px-5 py-5"
              >
                <div className="text-3xl font-semibold text-[var(--foreground)]">{item.value}</div>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel p-5 sm:p-8 md:p-10">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="eyebrow mb-2">Sample research brief</p>
              <h2 className="text-2xl font-semibold text-[var(--foreground)]">
                NVIDIA vs AMD vs Intel
              </h2>
            </div>
            <span className="rounded-full bg-[#e8f2ee] px-3 py-1 text-sm font-medium text-[var(--accent-strong)]">
              Live workspace
            </span>
          </div>

          <div className="space-y-4">
            <div className="rounded-[1.8rem] border border-[var(--border)] bg-[#1f1a17] p-5 text-[#efe5d6]">
              <p className="text-sm uppercase tracking-[0.16em] text-[#b3a28e]">Query</p>
              <p className="mt-3 leading-7">
                Analyze NVIDIA&apos;s latest earnings, compare growth with AMD and Intel, and
                summarize near-term risks from current market conditions.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { title: "Price context", body: "Historical chart, market cap, EPS, and relative performance." },
                { title: "News sentiment", body: "Recent headlines grouped into positive, neutral, and negative." },
                { title: "Filing evidence", body: "10-Q and earnings transcript snippets surfaced with citations." },
                { title: "Risk summary", body: "Competitive pressure, demand signals, and macro sensitivity." },
              ].map((item) => (
                <article
                  key={item.title}
                  className="rounded-[1.6rem] border border-[var(--border)] bg-white/60 p-5"
                >
                  <h3 className="text-lg font-semibold text-[var(--foreground)]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.body}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="glass-panel p-5 sm:p-8 md:p-10">
          <p className="eyebrow mb-5">Why teams use it</p>
          <div className="grid gap-6 md:grid-cols-2">
            {[
              {
                title: "Dynamic query planning",
                description:
                  "The backend decides whether to fetch prices, news, filings, or all three based on what the analyst actually asks.",
              },
              {
                title: "Cited structured output",
                description:
                  "Results render as cards, charts, comparisons, and risk sections instead of a plain wall of markdown.",
              },
              {
                title: "Workspace isolation",
                description:
                  "Every saved report, watchlist item, and org action is scoped by tenant and protected by role checks.",
              },
              {
                title: "Realtime analyst UX",
                description:
                  "Streaming responses, cached data pulls, and parallel tool execution keep the dashboard responsive.",
              },
            ].map((item) => (
              <article
                key={item.title}
                className="rounded-[1.75rem] border border-[var(--border)] bg-white/55 p-5"
              >
                <h2 className="mb-3 text-xl font-semibold text-[var(--foreground)]">
                  {item.title}
                </h2>
                <p className="leading-7 text-[var(--muted)]">{item.description}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="glass-panel p-5 sm:p-8 md:p-10">
          <p className="eyebrow mb-5">Designed for collaborative research</p>
          <div className="space-y-4 text-sm text-[var(--muted)]">
            <div className="rounded-[1.75rem] border border-[var(--border)] bg-white/60 p-5">
              Shared workspace access with role-aware controls for admins and analysts.
            </div>
            <div className="rounded-[1.75rem] border border-[var(--border)] bg-white/60 p-5">
              Saved research history, watchlists, and repeatable company coverage in one place.
            </div>
            <div className="rounded-[1.75rem] border border-[var(--border)] bg-[#1f1a17] p-5 text-[#efe5d6]">
              Every claim is tied to a source, so teams can move faster without losing trust.
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
