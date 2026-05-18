import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen text-[var(--ink-soft)]">
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[#f8faf7]/88 px-4 py-3 shadow-[0_12px_36px_rgba(15,23,42,0.06)] backdrop-blur-xl sm:px-6 md:px-10">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
          <Link href="/" className="group flex items-center gap-3" aria-label="Klypup Research OS home">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--foreground)] text-sm font-semibold text-white shadow-[0_14px_28px_rgba(15,23,42,0.18)] transition-transform duration-200 group-hover:-translate-y-0.5">
              KR
            </span>
            <span>
              <span className="block text-base font-semibold tracking-[-0.02em] text-[var(--foreground)]">
                Klypup Research OS
              </span>
              <span className="hidden text-xs font-medium text-[var(--muted)] sm:block">
                AI research workspace
              </span>
            </span>
          </Link>

          <nav
            aria-label="Primary navigation"
            className="hidden items-center gap-6 text-sm font-semibold text-[var(--muted)] lg:flex"
          >
            <a className="transition-colors hover:text-[var(--foreground)]" href="#product">
              Product
            </a>
            <a className="transition-colors hover:text-[var(--foreground)]" href="#workflow">
              Workflow
            </a>
            <a className="transition-colors hover:text-[var(--foreground)]" href="#security">
              Security
            </a>
            <a className="transition-colors hover:text-[var(--foreground)]" href="#contact">
              Contact
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden rounded-full px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-white/70 sm:inline-flex">
              Sign in
            </Link>
            <Link href="/signup" className="btn-secondary px-4 py-2 text-sm sm:px-5">
              Start free trial
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-col px-4 py-6 sm:px-6 md:px-10">
      <section className="mb-10 flex flex-col gap-6 pt-4 md:flex-row md:items-center md:justify-between">
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
        <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--muted)] md:gap-3">
          <span className="rounded-full border border-[var(--border)] bg-white/55 px-4 py-2">
            Source-attributed outputs
          </span>
          <span className="rounded-full border border-[var(--border)] bg-white/55 px-4 py-2">
            Multi-tenant workspaces
          </span>
          <span className="rounded-full border border-[var(--border)] bg-white/55 px-4 py-2">
            Filings plus market data
          </span>
        </div>
      </section>

      <section id="product" className="scroll-mt-28 grid items-stretch gap-6 lg:grid-cols-[1.1fr_0.9fr]">
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
              Start free trial
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

      <section id="workflow" className="mt-6 scroll-mt-28 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
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

        <div id="security" className="glass-panel scroll-mt-28 p-5 sm:p-8 md:p-10">
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

        <section className="mt-6 rounded-[2rem] border border-[var(--border-strong)] bg-[var(--foreground)] p-5 text-white shadow-[0_22px_60px_rgba(15,23,42,0.2)] sm:p-8 md:p-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr] lg:items-center">
            <div>
              <p className="eyebrow mb-3 text-[#9bd7cc]">Ready for analyst workflows</p>
              <h2 className="max-w-3xl text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                Start with a guided workspace, then scale into repeatable research coverage.
              </h2>
              <p className="mt-4 max-w-2xl leading-7 text-[#cbd5e1]">
                Create an organization, invite analysts, save reports, track companies, and keep
                every AI-generated insight tied to an auditable source.
              </p>
            </div>
            <div className="flex flex-col gap-3 rounded-[1.6rem] border border-white/12 bg-white/8 p-4 sm:flex-row sm:items-center sm:justify-end">
              <Link href="/signup" className="rounded-full bg-white px-6 py-3 text-center text-sm font-bold text-[var(--foreground)] shadow-[0_14px_30px_rgba(255,255,255,0.14)] transition-transform hover:-translate-y-0.5">
                Start free trial
              </Link>
              <Link href="/login" className="rounded-full border border-white/24 px-6 py-3 text-center text-sm font-extrabold text-[#ffffff] drop-shadow-[0_1px_4px_rgba(0,0,0,0.45)] transition-colors hover:bg-white/10">
                Open dashboard
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer id="contact" className="mt-10 border-t border-[var(--border)] bg-[#071511] px-4 py-10 text-[#d9ebe5] sm:px-6 md:px-10">
        <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <div className="mb-5 flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-sm font-semibold text-[var(--foreground)]">
                KR
              </div>
              <div>
                <p className="text-lg font-semibold text-white">Klypup Research OS</p>
                <p className="text-sm text-[#9fb8af]">Applied AI for investment research teams.</p>
              </div>
            </div>
            <p className="max-w-xl leading-7 text-[#b7cbc3]">
              A production-style research workspace with authentication, tenant isolation, tool
              orchestration, source attribution, and structured AI briefs.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="mailto:hello@klypup.ai" className="rounded-full border border-white/20 bg-white/8 px-4 py-2 text-sm font-extrabold text-[#ffffff] drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)] transition-colors hover:bg-white/14">
                Contact sales
              </a>
              <Link href="/signup" className="rounded-full bg-[#d7f5e8] px-4 py-2 text-sm font-semibold text-[#063f39] transition-transform hover:-translate-y-0.5">
                Start free trial
              </Link>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-white">
                Product
              </h3>
              <ul className="space-y-3 text-sm text-[#a8beb6]">
                <li><a className="hover:text-white" href="#product">Research workspace</a></li>
                <li><a className="hover:text-white" href="#workflow">AI workflow</a></li>
                <li><a className="hover:text-white" href="#security">Tenant security</a></li>
              </ul>
            </div>
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-white">
                Company
              </h3>
              <ul className="space-y-3 text-sm text-[#a8beb6]">
                <li><a className="hover:text-white" href="mailto:hello@klypup.ai">Contact</a></li>
                <li><Link className="hover:text-white" href="/login">Customer login</Link></li>
                <li><Link className="hover:text-white" href="/signup">Create workspace</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-white">
                Trust
              </h3>
              <ul className="space-y-3 text-sm text-[#a8beb6]">
                <li>Source-attributed answers</li>
                <li>Role-based access</li>
                <li>Organization isolation</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-10 flex w-full max-w-7xl flex-col gap-3 border-t border-white/10 pt-6 text-xs text-[#8fa79f] sm:flex-row sm:items-center sm:justify-between">
          <p>Copyright 2026 Klypup Research OS. All rights reserved.</p>
          <p>Built for analyst teams that need fast research without losing auditability.</p>
        </div>
      </footer>
    </div>
  );
}
