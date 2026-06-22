"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import Toast, { type ToastSeverity } from "./Toast";
import ErrorModal from "./ErrorModal";

interface ToastItem {
  id: string;
  message: string;
  severity: ToastSeverity;
}

interface NotificationContextValue {
  showToast: (message: string, severity: ToastSeverity) => void;
  showError: (message: string) => void;
  dismissError: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

let toastIdCounter = 0;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showToast = useCallback((message: string, severity: ToastSeverity) => {
    const id = `toast-${++toastIdCounter}-${Date.now()}`;
    setToasts((prev) => [{ id, message, severity }, ...prev]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showError = useCallback((message: string) => {
    setErrorMessage(message);
  }, []);

  const dismissError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  return (
    <NotificationContext.Provider value={{ showToast, showError, dismissError }}>
      {children}

      {/* Toast stack — top-right, newest on top */}
      <div
        className="pointer-events-none fixed top-4 right-4 z-40 flex w-full max-w-sm flex-col gap-2"
        aria-label="Notifications"
      >
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast
              id={toast.id}
              message={toast.message}
              severity={toast.severity}
              onDismiss={dismissToast}
            />
          </div>
        ))}
      </div>

      {/* Error modal */}
      {errorMessage && (
        <ErrorModal message={errorMessage} onDismiss={dismissError} />
      )}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return context;
}
