"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ErrorBoundary from "@/components/shared/ErrorBoundary";
import LogoutButton from "@/components/shared/LogoutButton";
import { useState } from "react";

const NAV_ITEMS = [
  {
    href: "/applicant",
    label: "Dashboard",
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
  },
  {
    href: "/applicant/profile",
    label: "My Profile",
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
    ),
  },
  {
    href: "/applicant/jobs",
    label: "Job Listings",
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    ),
  },
];

export default function ApplicantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navContent = (
    <div className="flex h-full flex-col">
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Applicant Portal
        </h2>
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/applicant"
                ? pathname === "/applicant"
                : pathname.startsWith(item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:bg-gray-200 hover:text-gray-900"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.icon}
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="mt-auto border-t border-gray-200 pt-4">
        <LogoutButton />
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* Mobile header */}
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 md:hidden">
        <h2 className="text-lg font-semibold text-gray-900">
          Applicant Portal
        </h2>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="inline-flex items-center justify-center rounded-md p-2 text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-expanded={mobileMenuOpen}
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? (
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          ) : (
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className={`fixed top-0 left-0 z-40 h-full w-64 transform border-r border-gray-200 bg-gray-50 p-6 pt-16 transition-transform duration-200 ease-in-out md:hidden ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <nav className="h-full" aria-label="Applicant dashboard navigation">{navContent}</nav>
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-gray-200 bg-gray-50 p-6 md:block">
        <nav className="h-full" aria-label="Applicant dashboard navigation">{navContent}</nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 pt-14 md:pt-0">
        <ErrorBoundary>{children}</ErrorBoundary>
      </div>
    </div>
  );
}
