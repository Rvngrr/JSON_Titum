"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { validatePassword, validateEmail } from "@/lib/validators/auth";
import RoleSelector, { type UserRole } from "./RoleSelector";
import { useToast } from "@/components/shared/Toast";

interface FormErrors {
  email?: string;
  password?: string[];
  name?: string;
  general?: string;
}

export default function RegisterForm() {
  const router = useRouter();
  const { addToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<UserRole>("applicant");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validateForm(): boolean {
    const newErrors: FormErrors = {};

    if (!name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(email)) {
      newErrors.email = "Please enter a valid email address";
    }

    const passwordResult = validatePassword(password);
    if (!passwordResult.valid) {
      newErrors.password = passwordResult.errors;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role,
            name: name.trim(),
          },
        },
      });

      if (error) {
        if (error.message.toLowerCase().includes("already registered")) {
          setErrors({
            email: "An account with this email already exists",
          });
          addToast("error", "An account with this email already exists.");
        } else {
          setErrors({ general: error.message });
          addToast("error", error.message);
        }
        return;
      }

      addToast("success", "Registration successful! Please check your email.");
      router.push("/login?message=Registration successful. Please check your email to confirm your account.");
    } catch {
      setErrors({ general: "An unexpected error occurred. Please try again." });
      addToast("error", "An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Registration form"
      className="w-full max-w-md space-y-6"
      noValidate
    >
      {errors.general && (
        <div role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {errors.general}
        </div>
      )}

      <div className="space-y-1">
        <label htmlFor="register-name" className="block text-sm font-medium text-gray-700">
          Full Name
        </label>
        <input
          id="register-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? "name-error" : undefined}
          disabled={isSubmitting}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          autoComplete="name"
        />
        {errors.name && (
          <p id="name-error" role="alert" className="text-sm text-red-600">
            {errors.name}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="register-email" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          id="register-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
          disabled={isSubmitting}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          autoComplete="email"
        />
        {errors.email && (
          <p id="email-error" role="alert" className="text-sm text-red-600">
            {errors.email}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="register-password" className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <input
          id="register-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? "password-errors" : undefined}
          disabled={isSubmitting}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          autoComplete="new-password"
        />
        {errors.password && (
          <ul
            id="password-errors"
            role="alert"
            className="mt-1 list-inside list-disc space-y-0.5 text-sm text-red-600"
          >
            {errors.password.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        )}
      </div>

      <RoleSelector value={role} onChange={setRole} disabled={isSubmitting} />

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "Creating account..." : "Create Account"}
      </button>
    </form>
  );
}
