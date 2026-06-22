"use client";

import { useState } from "react";

interface ImportResult {
  success: boolean;
  importedCount?: number;
  skippedDuplicates?: number;
  cacheUsed?: boolean;
  cacheTimestamp?: string | null;
  warnings?: string[];
  error?: string;
}

export default function ImportJobsPanel() {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [lastCacheTimestamp, setLastCacheTimestamp] = useState<string | null>(null);

  const handleImport = async (forceRefresh: boolean = false) => {
    setImporting(true);
    setResult(null);
    setError(null);
    setWarningMessage(null);

    try {
      const response = await fetch("/api/jobs/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceRefresh }),
      });

      const data: ImportResult = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || "Import failed. Please try again.");
      } else {
        setResult(data);
        if (data.cacheTimestamp) {
          setLastCacheTimestamp(data.cacheTimestamp);
        }
        // Check for LLM fallback warning
        const llmWarning = data.warnings?.find(
          (w) =>
            w.toLowerCase().includes("llm") ||
            w.toLowerCase().includes("local fallback") ||
            w.toLowerCase().includes("skill extraction")
        );
        if (llmWarning) {
          setWarningMessage(llmWarning);
        }
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setImporting(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <section aria-labelledby="import-jobs-heading" className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 id="import-jobs-heading" className="text-lg font-semibold text-gray-900">
            Import Jobs from JSearch
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Fetch real job listings from the JSearch API and import them into the platform.
          </p>
        </div>
      </div>

      {/* Last cached fetch timestamp */}
      {lastCacheTimestamp && (
        <p className="mt-3 text-sm text-gray-500">
          Last fetched:{" "}
          <time dateTime={lastCacheTimestamp} className="font-medium text-gray-700">
            {formatTimestamp(lastCacheTimestamp)}
          </time>
        </p>
      )}

      {/* Action buttons */}
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => handleImport(false)}
          disabled={importing}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          aria-busy={importing}
        >
          {importing && (
            <svg
              className="h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          )}
          {importing ? "Importing..." : "Import Jobs"}
        </button>

        <button
          type="button"
          onClick={() => handleImport(true)}
          disabled={importing}
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          aria-busy={importing}
        >
          {importing && (
            <svg
              className="h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          )}
          Force Refresh
        </button>
      </div>

      {/* Loading indicator */}
      {importing && (
        <div className="mt-4 flex items-center gap-2 text-sm text-blue-600" role="status" aria-live="polite">
          <svg
            className="h-5 w-5 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span>Importing jobs from JSearch API. This may take a moment...</span>
        </div>
      )}

      {/* Success message */}
      {result && result.success && (
        <div
          className="mt-4 rounded-md bg-green-50 p-4"
          role="alert"
          aria-live="polite"
        >
          <div className="flex">
            <svg
              className="h-5 w-5 shrink-0 text-green-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                clipRule="evenodd"
              />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Import Successful</h3>
              <p className="mt-1 text-sm text-green-700">
                {result.importedCount} job{result.importedCount !== 1 ? "s" : ""} imported,{" "}
                {result.skippedDuplicates} skipped (already exists).
                {result.cacheUsed && " Used cached data."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div
          className="mt-4 rounded-md bg-red-50 p-4"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex">
            <svg
              className="h-5 w-5 shrink-0 text-red-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                clipRule="evenodd"
              />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Import Failed</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Warning toast for LLM fallback */}
      {warningMessage && (
        <div
          className="mt-4 rounded-md bg-yellow-50 p-4"
          role="alert"
          aria-live="polite"
        >
          <div className="flex">
            <svg
              className="h-5 w-5 shrink-0 text-yellow-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Warning</h3>
              <p className="mt-1 text-sm text-yellow-700">{warningMessage}</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
