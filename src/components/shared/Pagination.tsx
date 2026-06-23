"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

interface PaginationProps {
  /** Current page (1-indexed) */
  currentPage: number;
  /** Total number of items */
  totalItems: number;
  /** Items per page */
  pageSize: number;
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Optional className for the wrapper */
  className?: string;
}

/**
 * Shared pagination component with prev/next buttons and page numbers.
 * Styled to match the glass-card design system. Shows at most 5 page
 * number buttons with ellipsis for large page counts.
 */
export default function Pagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  className = "",
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const handlePrev = useCallback(() => {
    if (currentPage > 1) onPageChange(currentPage - 1);
  }, [currentPage, onPageChange]);

  const handleNext = useCallback(() => {
    if (currentPage < totalPages) onPageChange(currentPage + 1);
  }, [currentPage, totalPages, onPageChange]);

  // Generate page numbers to display (max 5 visible + ellipsis)
  const pageNumbers = useMemo(() => {
    const pages: (number | "ellipsis-start" | "ellipsis-end")[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push("ellipsis-start");
      }

      // Pages around current
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push("ellipsis-end");
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  }, [currentPage, totalPages]);

  // Don't render pagination if only 1 page
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <nav
      aria-label="Pagination"
      className={`flex flex-col items-center gap-3 sm:flex-row sm:justify-between ${className}`}
    >
      {/* Item range indicator */}
      <p className="text-xs text-[var(--text-muted)]">
        Showing {startItem}–{endItem} of {totalItems}
      </p>

      {/* Page controls */}
      <div className="flex items-center gap-1">
        {/* Previous button */}
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentPage <= 1}
          aria-label="Previous page"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card-solid)] text-sm text-[var(--text-secondary)] transition-colors hover:border-cyan-500/40 hover:text-[var(--accent)] disabled:pointer-events-none disabled:opacity-40"
        >
          ‹
        </button>

        {/* Page numbers */}
        {pageNumbers.map((page) => {
          if (page === "ellipsis-start" || page === "ellipsis-end") {
            return (
              <span
                key={page}
                className="inline-flex h-8 w-8 items-center justify-center text-xs text-[var(--text-muted)]"
                aria-hidden="true"
              >
                …
              </span>
            );
          }

          const isActive = page === currentPage;
          return (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange(page)}
              aria-label={`Page ${page}`}
              aria-current={isActive ? "page" : undefined}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border text-sm font-medium transition-colors ${
                isActive
                  ? "border-cyan-500/60 bg-cyan-500/10 text-[var(--accent)]"
                  : "border-[var(--border-subtle)] bg-[var(--bg-card-solid)] text-[var(--text-secondary)] hover:border-cyan-500/40 hover:text-[var(--accent)]"
              }`}
            >
              {page}
            </button>
          );
        })}

        {/* Next button */}
        <button
          type="button"
          onClick={handleNext}
          disabled={currentPage >= totalPages}
          aria-label="Next page"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card-solid)] text-sm text-[var(--text-secondary)] transition-colors hover:border-cyan-500/40 hover:text-[var(--accent)] disabled:pointer-events-none disabled:opacity-40"
        >
          ›
        </button>
      </div>
    </nav>
  );
}

/**
 * Hook to manage pagination state and slice data for the current page.
 */
export function usePagination<T>(items: T[], pageSize: number = 10) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Reset to page 1 if current page exceeds total pages (e.g. after filtering)
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  const safePage = currentPage > totalPages ? 1 : currentPage;

  const paginatedItems = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize]
  );

  return {
    currentPage: safePage,
    setCurrentPage,
    paginatedItems,
    totalItems,
    totalPages,
    pageSize,
  };
}


