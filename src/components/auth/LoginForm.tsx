"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { data, error: authError } =
        await supabase.auth.signInWithPassword({ email, password });

      if (authError) {
        setError("Invalid email or password. Please try again.");
        setIsLoading(false);
        return;
      }

      const role = data.user?.user_metadata?.role;
      if (role === "hr_user") {
        router.push("/hr");
      } else {
        router.push("/applicant");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-label="Login form" noValidate>
      {error && (
        <div role="alert" aria-live="assertive" className="mb-4 rounded-xl bg-[var(--error-bg)] p-3 text-sm text-[var(--error-text)]">
          {error}
        </div>
      )}

      <div className="mb-4">
        <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
          Email
        </label>
        <input
          id="login-email"
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          aria-required="true"
          className="input-glass w-full px-4 py-2.5 text-sm"
          placeholder="you@example.com"
        />
      </div>

      <div className="mb-6">
        <label htmlFor="login-password" className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
          Password
        </label>
        <input
          id="login-password"
          type="password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          aria-required="true"
          className="input-glass w-full px-4 py-2.5 text-sm"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        aria-disabled={isLoading}
        className="btn-primary w-full text-sm"
      >
        {isLoading ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
