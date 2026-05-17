"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Toast } from "@/components/toast";
import { apiFetch, AuthSession, saveSession } from "@/lib/api";

type AuthMode = "login" | "signup";

type AuthFormProps = {
  mode: AuthMode;
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSignup = mode === "signup";

  function validateForm() {
    if (isSignup && fullName.trim().length < 2) {
      return "Please enter your full name.";
    }
    if (isSignup && organizationName.trim().length < 2) {
      return "Please enter your organization name.";
    }
    if (!email.trim()) {
      return "Please enter your email address.";
    }
    if (!email.includes("@")) {
      return "Please enter a valid email address.";
    }
    if (password.length < 8) {
      return "Password must be at least 8 characters.";
    }
    return "";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const path = isSignup ? "/auth/signup" : "/auth/login";
      const payload = isSignup
        ? {
            full_name: fullName,
            organization_name: organizationName,
            email,
            password,
          }
        : {
            email,
            password,
          };

      const session = await apiFetch<AuthSession>(path, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      saveSession(session);
      router.push("/dashboard");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Something went wrong. Please retry.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Toast
        message={error}
        title={isSignup ? "Workspace creation failed" : "Login failed"}
        onClose={() => setError("")}
      />

      <div className="glass-panel w-full max-w-xl p-5 sm:p-8 md:p-10">
        <p className="eyebrow mb-4">{isSignup ? "Create Workspace" : "Secure Sign In"}</p>
        <h1 className="text-2xl font-semibold text-[var(--foreground)] sm:text-3xl md:text-4xl">
          {isSignup ? "Open your research workspace." : "Welcome back."}
        </h1>
        <p className="mt-3 max-w-lg leading-7 text-[var(--muted)]">
          {isSignup
            ? "You will become the first admin for a new organization and can invite analysts after setup."
            : "Use the account linked to your organization to continue with your saved workspace context."}
        </p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
          {isSignup ? (
            <>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
                  Full name
                </span>
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="field"
                  placeholder="Aarav Mehta"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
                  Organization name
                </span>
                <input
                  value={organizationName}
                  onChange={(event) => setOrganizationName(event.target.value)}
                  className="field"
                  placeholder="Northstar Capital"
                  required
                />
              </label>
            </>
          ) : null}

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="field"
              placeholder="analyst@northstar.com"
              required
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="field"
              placeholder="Minimum 8 characters"
              minLength={8}
              required
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full disabled:cursor-not-allowed disabled:opacity-60 ${
              isSignup ? "btn-secondary" : "btn-primary"
            }`}
          >
            {isSubmitting ? "Submitting..." : isSignup ? "Create workspace" : "Enter workspace"}
          </button>
        </form>

        <p className="mt-6 text-sm text-[var(--muted)]">
          {isSignup ? "Already have an account?" : "Need a new workspace?"}{" "}
          <Link
            href={isSignup ? "/login" : "/signup"}
            className="font-medium text-[var(--accent-strong)] underline-offset-4 hover:underline"
          >
            {isSignup ? "Login here" : "Sign up here"}
          </Link>
        </p>
      </div>
    </>
  );
}
