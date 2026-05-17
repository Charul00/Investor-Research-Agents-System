import Link from "next/link";

import { AuthForm } from "@/components/auth-form";

export default function SignupPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center gap-8 px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:px-10">
      <section className="max-w-lg">
        <p className="eyebrow mb-4">Create Organization</p>
        <h1 className="text-3xl font-semibold leading-tight text-[var(--foreground)] sm:text-4xl lg:text-5xl">
          Create a shared research workspace for your team.
        </h1>
        <p className="mt-4 max-w-xl leading-7 text-[var(--muted)]">
          Set up your admin account, create the first organization, and start centralizing company
          research, watchlists, and analyst collaboration.
        </p>
        <div className="mt-6 space-y-3 text-sm text-[var(--muted)]">
          <div className="rounded-[1.4rem] border border-[var(--border)] bg-white/60 px-4 py-3">
            Admins can manage access and invite analysts into the same workspace.
          </div>
          <div className="rounded-[1.4rem] border border-[var(--border)] bg-white/60 px-4 py-3">
            Research data stays isolated by organization from the very first session.
          </div>
        </div>
        <Link
          href="/"
          className="btn-secondary mt-6 text-sm"
        >
          Back to product overview
        </Link>
      </section>

      <AuthForm mode="signup" />
    </main>
  );
}
