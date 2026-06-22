"use client";

import { useEffect, useState } from "react";

export type ToastSeverity = "success" | "warning" | "info";

export interface ToastProps {
  id: string;
  message: string;
  severity: ToastSeverity;
  onDismiss: (id: string) => void;
}

const severityConfig: Record<
  ToastSeverity,
  { icon: React.ReactNode; bgClass: string; label: string }
> = {
  success: {
    icon: (
      <svg
        className="h-5 w-5 text-green-600"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 13l4 4L19 7"
        />
      </svg>
    ),
    bgClass: "bg-green-50 border-green-200",
    label: "Success",
  },
  warning: {
    icon: (
      <svg
        className="h-5 w-5 text-yellow-600"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
        />
      </svg>
    ),
    bgClass: "bg-yellow-50 border-yellow-200",
    label: "Warning",
  },
  info: {
    icon: (
      <svg
        className="h-5 w-5 text-blue-600"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" strokeWidth={2} />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 16v-4m0-4h.01"
        />
      </svg>
    ),
    bgClass: "bg-blue-50 border-blue-200",
    label: "Info",
  },
};

export default function Toast({ id, message, severity, onDismiss }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const config = severityConfig[severity];

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onDismiss(id), 300);
    }, 5000);

    return () => clearTimeout(timer);
  }, [id, onDismiss]);

  return (
    <div
      role="alert"
      aria-live="polite"
      aria-label={`${config.label} notification`}
      className={`flex items-start gap-3 rounded-lg border p-4 shadow-md transition-all duration-300 ${
        config.bgClass
      } ${isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}`}
    >
      <span className="flex-shrink-0">{config.icon}</span>
      <p className="flex-1 text-sm text-gray-800">{message}</p>
      <button
        type="button"
        onClick={() => onDismiss(id)}
        className="flex-shrink-0 rounded p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400"
        aria-label="Dismiss notification"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}
