"use client";

import Link from "next/link";

import { WorkspaceDashboard } from "@/components/workspace-dashboard";
import { SESSION_PENDING, useStoredSession } from "@/lib/session-store";

export default function DashboardPage() {
  const session = useStoredSession();

  if (session === SESSION_PENDING) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-8 sm:px-6 md:px-10">
        <div className="glass-panel rounded-[2rem] px-8 py-6 text-lg text-[var(--muted)]">
          Loading workspace...
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-4 py-8 sm:px-6 md:px-10">
        <div className="glass-panel max-w-xl p-5 sm:p-8">
          <p className="eyebrow mb-3">Workspace access</p>
          <h1 className="text-3xl font-semibold text-[var(--foreground)] sm:text-4xl">
            Sign in to continue.
          </h1>
          <p className="mt-3 leading-7 text-[var(--muted)]">
            Open your organization workspace to access saved research, company watchlists, and
            shared analyst context.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="btn-primary"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="btn-secondary"
            >
              Create workspace
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return <WorkspaceDashboard initialSession={session} />;
}
