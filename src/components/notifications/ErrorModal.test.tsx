import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import ErrorModal from "./ErrorModal";

describe("ErrorModal", () => {
  it("renders error message and dismiss button", () => {
    const onDismiss = vi.fn();
    render(
      <ErrorModal message="Authentication failed" onDismiss={onDismiss} />
    );

    expect(screen.getByText("Authentication failed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
  });

  it("calls onDismiss when dismiss button is clicked", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(
      <ErrorModal message="Server error" onDismiss={onDismiss} />
    );

    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("calls onDismiss when Escape key is pressed", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(
      <ErrorModal message="Data loss risk" onDismiss={onDismiss} />
    );

    await user.keyboard("{Escape}");
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("calls onDismiss when overlay is clicked", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(
      <ErrorModal message="Critical error" onDismiss={onDismiss} />
    );

    // The overlay has aria-hidden="true"
    const overlay = document.querySelector('[aria-hidden="true"]') as HTMLElement;
    await user.click(overlay);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("has proper accessibility attributes for modal", () => {
    const onDismiss = vi.fn();
    render(
      <ErrorModal message="Error message" onDismiss={onDismiss} />
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "error-modal-title");
    expect(dialog).toHaveAttribute("aria-describedby", "error-modal-message");
  });

  it("focuses the dismiss button on mount", () => {
    const onDismiss = vi.fn();
    render(
      <ErrorModal message="Focus test" onDismiss={onDismiss} />
    );

    const dismissButton = screen.getByRole("button", { name: "Dismiss" });
    expect(dismissButton).toHaveFocus();
  });
});
