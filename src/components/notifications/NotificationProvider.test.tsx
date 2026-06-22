import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NotificationProvider, useNotifications } from "./NotificationProvider";

// Test component that uses the hook
function TestConsumer() {
  const { showToast, showError, dismissError } = useNotifications();

  return (
    <div>
      <button onClick={() => showToast("Success!", "success")}>
        Show Success Toast
      </button>
      <button onClick={() => showToast("Warning!", "warning")}>
        Show Warning Toast
      </button>
      <button onClick={() => showToast("Info!", "info")}>
        Show Info Toast
      </button>
      <button onClick={() => showError("Critical error occurred")}>
        Show Error
      </button>
      <button onClick={() => dismissError()}>Dismiss Error</button>
    </div>
  );
}

describe("NotificationProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("throws error when useNotifications is used outside provider", () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      function Orphan() {
        useNotifications();
        return null;
      }
      render(<Orphan />);
    }).toThrow("useNotifications must be used within a NotificationProvider");

    consoleSpy.mockRestore();
  });

  it("shows a toast notification on showToast call", async () => {
    vi.useRealTimers();
    const user = userEvent.setup();

    render(
      <NotificationProvider>
        <TestConsumer />
      </NotificationProvider>
    );

    await user.click(screen.getByText("Show Success Toast"));

    expect(screen.getByText("Success!")).toBeInTheDocument();
    expect(screen.getByLabelText("Success notification")).toBeInTheDocument();
  });

  it("shows warning toast with correct severity", async () => {
    vi.useRealTimers();
    const user = userEvent.setup();

    render(
      <NotificationProvider>
        <TestConsumer />
      </NotificationProvider>
    );

    await user.click(screen.getByText("Show Warning Toast"));

    expect(screen.getByText("Warning!")).toBeInTheDocument();
    expect(screen.getByLabelText("Warning notification")).toBeInTheDocument();
  });

  it("stacks multiple toasts with newest on top", async () => {
    vi.useRealTimers();
    const user = userEvent.setup();

    render(
      <NotificationProvider>
        <TestConsumer />
      </NotificationProvider>
    );

    await user.click(screen.getByText("Show Success Toast"));
    await user.click(screen.getByText("Show Warning Toast"));
    await user.click(screen.getByText("Show Info Toast"));

    const alerts = screen.getAllByRole("alert");
    expect(alerts).toHaveLength(3);

    // Newest (info) is first in DOM — top of the stack
    expect(alerts[0]).toHaveTextContent("Info!");
    expect(alerts[1]).toHaveTextContent("Warning!");
    expect(alerts[2]).toHaveTextContent("Success!");
  });

  it("shows error modal on showError call", async () => {
    vi.useRealTimers();
    const user = userEvent.setup();

    render(
      <NotificationProvider>
        <TestConsumer />
      </NotificationProvider>
    );

    await user.click(screen.getByText("Show Error"));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Critical error occurred")).toBeInTheDocument();
  });

  it("dismisses error modal on dismissError call", async () => {
    vi.useRealTimers();
    const user = userEvent.setup();

    render(
      <NotificationProvider>
        <TestConsumer />
      </NotificationProvider>
    );

    await user.click(screen.getByText("Show Error"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByText("Dismiss Error"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("auto-dismisses toast after 5 seconds", async () => {
    vi.useRealTimers();
    vi.useFakeTimers();

    render(
      <NotificationProvider>
        <TestConsumer />
      </NotificationProvider>
    );

    act(() => {
      // Trigger toast programmatically via button click simulation
      const button = screen.getByText("Show Success Toast");
      button.click();
    });

    expect(screen.getByText("Success!")).toBeInTheDocument();

    // Advance past auto-dismiss timeout (5s) + fade-out (300ms)
    act(() => {
      vi.advanceTimersByTime(5300);
    });

    expect(screen.queryByText("Success!")).not.toBeInTheDocument();
  });
});
