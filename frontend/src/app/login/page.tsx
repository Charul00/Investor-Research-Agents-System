import Link from "next/link";

import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center gap-8 px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:px-10">
      <section className="max-w-lg">
        <p className="eyebrow mb-4">Research Workspace Access</p>
        <h1 className="text-3xl font-semibold leading-tight text-[var(--foreground)] sm:text-4xl lg:text-5xl">
          Step back into your firm&apos;s research desk.
        </h1>
        <p className="mt-4 max-w-xl leading-7 text-[var(--muted)]">
          Move between company briefs, source-backed analysis, and shared watchlists inside your
          organization workspace.
        </p>
        <div className="mt-6 space-y-3 text-sm text-[var(--muted)]">
          <div className="rounded-[1.4rem] border border-[var(--border)] bg-white/60 px-4 py-3">
            Multi-tenant access keeps every workspace isolated.
          </div>
          <div className="rounded-[1.4rem] border border-[var(--border)] bg-white/60 px-4 py-3">
            Built for analysts working across filings, prices, and market headlines.
          </div>
        </div>
        <Link
          href="/"
          className="btn-secondary mt-6 text-sm"
        >
          Back to product overview
        </Link>
      </section>

      <AuthForm mode="login" />
    </main>
  );
}
