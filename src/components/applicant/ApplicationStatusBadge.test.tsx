import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import ApplicationStatusBadge from "./ApplicationStatusBadge";

describe("ApplicationStatusBadge", () => {
  it("renders 'Not Applied' when applied is false", () => {
    render(<ApplicationStatusBadge applied={false} />);
    const badge = screen.getByLabelText("Application status: Not Applied");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent("Not Applied");
    expect(badge).toHaveClass("bg-gray-100");
  });

  it("renders 'Applied' for internal applications", () => {
    render(<ApplicationStatusBadge applied={true} applicationStatus="applied" />);
    const badge = screen.getByLabelText("Application status: Applied");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent("Applied");
    expect(badge).toHaveClass("bg-green-100");
  });

  it("renders 'Applied' when applied is true but no status specified", () => {
    render(<ApplicationStatusBadge applied={true} />);
    const badge = screen.getByLabelText("Application status: Applied");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent("Applied");
    expect(badge).toHaveClass("bg-green-100");
  });

  it("renders 'Applied Externally' for external applications", () => {
    render(
      <ApplicationStatusBadge applied={true} applicationStatus="applied_externally" />
    );
    const badge = screen.getByLabelText("Application status: Applied Externally");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent("Applied Externally");
    expect(badge).toHaveClass("bg-purple-100");
  });

  it("visually distinguishes Applied (green) from Applied Externally (purple)", () => {
    const { rerender } = render(
      <ApplicationStatusBadge applied={true} applicationStatus="applied" />
    );
    const appliedBadge = screen.getByLabelText("Application status: Applied");
    expect(appliedBadge).toHaveClass("bg-green-100", "text-green-800");

    rerender(
      <ApplicationStatusBadge applied={true} applicationStatus="applied_externally" />
    );
    const externalBadge = screen.getByLabelText("Application status: Applied Externally");
    expect(externalBadge).toHaveClass("bg-purple-100", "text-purple-800");
  });
});
