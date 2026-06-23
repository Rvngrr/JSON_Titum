"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { validatePassword, validateEmail } from "@/lib/validators/auth";
import RoleSelector, { type UserRole } from "./RoleSelector";

interface FormErrors {
  email?: string;
  password?: string[];
  name?: string;
  general?: string;
}

export default function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<UserRole>("applicant");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVerificationNotice, setShowVerificationNotice] = useState(false);

  function validateForm(): boolean {
    const newErrors: FormErrors = {};
    if (!name.trim()) newErrors.name = "Name is required";
    if (!email.trim()) newErrors.email = "Email is required";
    else if (!validateEmail(email)) newErrors.email = "Please enter a valid email address";
    const passwordResult = validatePassword(password);
    if (!passwordResult.valid) newErrors.password = passwordResult.errors;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    setErrors({});

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { role, name: name.trim() } },
      });

      if (error) {
        if (error.message.toLowerCase().includes("already registered")) {
          setErrors({ email: "An account with this email already exists" });
        } else {
          setErrors({ general: error.message });
        }
        return;
      }
      setShowVerificationNotice(true);
    } catch {
      setErrors({ general: "An unexpected error occurred. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-label="Registration form" className="w-full space-y-5" noValidate>
      {/* Email Verification Notice */}
      {showVerificationNotice && (
        <div className="rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/5 p-5 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)]/15">
            <svg className="h-6 w-6 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Check your email</h3>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            We&apos;ve sent a verification link to <span className="font-medium text-[var(--text-primary)]">{email}</span>. Please confirm your email address to activate your account.
          </p>
          <div className="pt-2">
            <Link href="/login" className="text-xs font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors">
              Go to Sign In →
            </Link>
          </div>
        </div>
      )}

      {!showVerificationNotice && (
        <>
      {errors.general && (
        <div role="alert" className="rounded-xl bg-[var(--error-bg)] p-3 text-sm text-[var(--error-text)]">
          {errors.general}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="register-name" className="block text-sm font-medium text-[var(--text-primary)]">Full Name</label>
        <input
          id="register-name" type="text" value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? "name-error" : undefined}
          disabled={isSubmitting}
          className="input-glass w-full px-4 py-2.5 text-sm"
          autoComplete="name"
        />
        {errors.name && <p id="name-error" role="alert" className="text-xs text-[var(--error-text)]">{errors.name}</p>}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="register-email" className="block text-sm font-medium text-[var(--text-primary)]">Email</label>
        <input
          id="register-email" type="email" value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
          disabled={isSubmitting}
          className="input-glass w-full px-4 py-2.5 text-sm"
          autoComplete="email"
        />
        {errors.email && <p id="email-error" role="alert" className="text-xs text-[var(--error-text)]">{errors.email}</p>}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="register-password" className="block text-sm font-medium text-[var(--text-primary)]">Password</label>
        <input
          id="register-password" type="password" value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? "password-errors" : undefined}
          disabled={isSubmitting}
          className="input-glass w-full px-4 py-2.5 text-sm"
          autoComplete="new-password"
        />
        {errors.password && (
          <ul id="password-errors" role="alert" className="mt-1 list-inside list-disc space-y-0.5 text-xs text-[var(--error-text)]">
            {errors.password.map((err) => <li key={err}>{err}</li>)}
          </ul>
        )}
      </div>

      <RoleSelector value={role} onChange={setRole} disabled={isSubmitting} />

      <button type="submit" disabled={isSubmitting} className="btn-primary w-full text-sm">
        {isSubmitting ? "Creating account..." : "Create Account"}
      </button>
        </>
      )}
    </form>
  );
}
