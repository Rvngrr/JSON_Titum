import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Toast from "./Toast";

describe("Toast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders with success severity and green checkmark", () => {
    const onDismiss = vi.fn();
    render(
      <Toast
        id="test-1"
        message="Job imported successfully"
        severity="success"
        onDismiss={onDismiss}
      />
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Job imported successfully")).toBeInTheDocument();
    expect(screen.getByLabelText("Success notification")).toBeInTheDocument();
  });

  it("renders with warning severity and yellow triangle", () => {
    const onDismiss = vi.fn();
    render(
      <Toast
        id="test-2"
        message="API quota nearly exhausted"
        severity="warning"
        onDismiss={onDismiss}
      />
    );

    expect(screen.getByLabelText("Warning notification")).toBeInTheDocument();
    expect(screen.getByText("API quota nearly exhausted")).toBeInTheDocument();
  });

  it("renders with info severity and blue icon", () => {
    const onDismiss = vi.fn();
    render(
      <Toast
        id="test-3"
        message="Using cached data"
        severity="info"
        onDismiss={onDismiss}
      />
    );

    expect(screen.getByLabelText("Info notification")).toBeInTheDocument();
    expect(screen.getByText("Using cached data")).toBeInTheDocument();
  });

  it("auto-dismisses after 5 seconds", () => {
    const onDismiss = vi.fn();
    render(
      <Toast
        id="test-4"
        message="Auto dismiss test"
        severity="success"
        onDismiss={onDismiss}
      />
    );

    expect(onDismiss).not.toHaveBeenCalled();

    // Advance past the 5s auto-dismiss + 300ms fade-out
    act(() => {
      vi.advanceTimersByTime(5300);
    });

    expect(onDismiss).toHaveBeenCalledWith("test-4");
  });

  it("can be manually dismissed via button", async () => {
    vi.useRealTimers();
    const onDismiss = vi.fn();
    const user = userEvent.setup();

    render(
      <Toast
        id="test-5"
        message="Dismiss me"
        severity="info"
        onDismiss={onDismiss}
      />
    );

    const dismissButton = screen.getByLabelText("Dismiss notification");
    await user.click(dismissButton);

    expect(onDismiss).toHaveBeenCalledWith("test-5");
  });

  it("has proper accessibility attributes", () => {
    const onDismiss = vi.fn();
    render(
      <Toast
        id="test-6"
        message="Accessible toast"
        severity="success"
        onDismiss={onDismiss}
      />
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveAttribute("aria-live", "polite");
  });
});
