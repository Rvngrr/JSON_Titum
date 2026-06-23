"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ErrorBoundary from "@/components/shared/ErrorBoundary";
import LogoutButton from "@/components/shared/LogoutButton";
import ThemeToggle from "@/components/shared/ThemeToggle";
import FloatingOrbs from "@/components/shared/FloatingOrbs";

const NAV_ITEMS = [
  {
    href: "/hr",
    label: "Dashboard",
    exactMatch: true,
    iconColor: "text-[var(--accent)]",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: "/hr/analytics",
    label: "Analytics",
    exactMatch: false,
    iconColor: "text-purple-400",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    href: "/hr/jobs/new",
    label: "Create Posting",
    exactMatch: false,
    iconColor: "text-green-400",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    ),
  },
  {
    href: "/hr/applicants",
    label: "Applicants",
    exactMatch: false,
    iconColor: "text-cyan-400",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    href: "/hr/profile",
    label: "My Profile",
    exactMatch: false,
    iconColor: "text-amber-400",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

export default function HRLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (item: (typeof NAV_ITEMS)[0]) => {
    if (item.exactMatch) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  const navContent = (
    <div className="flex h-full flex-col">
      <div>
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 mb-6">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-accent-teal to-periwinkle">
            <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-sm font-bold text-[var(--text-primary)]">CareerFlow</span>
        </Link>

        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)] mb-4">
          Admin Portal
        </p>

        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                    active
                      ? "bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--text-primary)]"
                  }`}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className={active ? "" : item.iconColor}>{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-auto space-y-4 border-t border-[var(--border-subtle)] pt-4">
        <ThemeToggle />
        <LogoutButton />
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[var(--bg-secondary)] relative overflow-hidden">
      {/* Subtle background decoration */}
      <FloatingOrbs showDots={false} orbs={[
        { color: "bg-[var(--orb-pink)]", size: "h-48 w-48", x: "right-[-5%]", y: "top-[10%]", delay: 0, blur: "blur-3xl" },
        { color: "bg-[var(--orb-blue)]", size: "h-40 w-40", x: "left-[40%]", y: "bottom-[-5%]", delay: 2, blur: "blur-3xl" },
        { color: "bg-[var(--orb-lavender)]", size: "h-32 w-32", x: "right-[20%]", y: "bottom-[30%]", delay: 4, blur: "blur-3xl" },
      ]} />
      {/* Mobile header */}
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 md:hidden sidebar-glass">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-accent-teal to-periwinkle">
            <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-sm font-bold text-[var(--text-primary)]">CareerFlow</span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="inline-flex items-center justify-center rounded-xl p-2 text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)] transition-colors"
          aria-expanded={mobileMenuOpen}
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? (
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Mobile sidebar drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-0 left-0 z-40 h-full w-64 sidebar-glass p-6 pt-16 md:hidden"
          >
            <nav className="h-full" aria-label="HR dashboard navigation">{navContent}</nav>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop sidebar — fixed height, does not scroll with content */}
      <aside className="hidden w-64 shrink-0 sidebar-glass p-6 md:block h-screen sticky top-0 overflow-y-auto">
        <nav className="h-full" aria-label="HR dashboard navigation">{navContent}</nav>
      </aside>

      {/* Main content — independently scrollable */}
      <div className="flex-1 pt-14 md:pt-0 overflow-y-auto h-screen">
        <ErrorBoundary>{children}</ErrorBoundary>
      </div>
    </div>
  );
}
