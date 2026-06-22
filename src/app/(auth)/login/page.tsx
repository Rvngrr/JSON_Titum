"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import LoginForm from "@/components/auth/LoginForm";
import FloatingOrbs from "@/components/shared/FloatingOrbs";
import ThemeToggle from "@/components/shared/ThemeToggle";

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-hero-gradient px-4 py-12">
      <FloatingOrbs />

      {/* Theme toggle in top-right */}
      <div className="absolute right-4 top-4 z-20 md:right-8 md:top-6">
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md space-y-6"
      >
        {/* Logo */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <img src="/careerflow.png" alt="CareerFlow logo" className="h-8 w-8 rounded-lg object-contain" />
            <span className="text-xl font-bold text-[var(--text-primary)]">CareerFlow</span>
          </Link>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Welcome back</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Sign in to your account to continue
          </p>
        </div>

        {/* Glass card form container */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="glass-card p-6 md:p-8"
        >
          <LoginForm />
        </motion.div>

        <p className="text-center text-sm text-[var(--text-secondary)]">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors">
            Register here
          </Link>
        </p>
      </motion.div>
    </main>
  );
}
