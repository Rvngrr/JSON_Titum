"use client";

import { useEffect, useRef } from "react";

export interface ErrorModalProps {
  message: string;
  onDismiss: () => void;
}

export default function ErrorModal({ message, onDismiss }: ErrorModalProps) {
  const dismissButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Focus the dismiss button when modal opens
    dismissButtonRef.current?.focus();

    // Trap focus within the modal and handle escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onDismiss();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onDismiss]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="error-modal-title"
      aria-describedby="error-modal-message"
    >
      {/* Overlay - blocks page interaction */}
      <div
        className="absolute inset-0 bg-black/50"
        aria-hidden="true"
        onClick={onDismiss}
      />

      {/* Modal content */}
      <div className="relative z-10 mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="flex flex-col items-center gap-4 text-center">
          {/* Error icon */}
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-6 w-6 text-red-600"
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
          </div>

          <h2
            id="error-modal-title"
            className="text-lg font-semibold text-gray-900"
          >
            Error
          </h2>

          <p id="error-modal-message" className="text-sm text-gray-600">
            {message}
          </p>

          <button
            ref={dismissButtonRef}
            type="button"
            onClick={onDismiss}
            className="mt-2 w-full rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
