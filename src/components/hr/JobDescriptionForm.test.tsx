import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import JobDescriptionForm from "./JobDescriptionForm";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock Supabase client
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockSelect = vi.fn();
const mockSingle = vi.fn();
const mockEq = vi.fn();
const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: (table: string) => {
      if (table === "job_descriptions") {
        return {
          insert: (data: unknown) => {
            mockInsert(data);
            return {
              select: (fields: string) => {
                mockSelect(fields);
                return {
                  single: () => mockSingle(),
                };
              },
            };
          },
          update: (data: unknown) => {
            mockUpdate(data);
            return {
              eq: (_field: string, _value: string) => mockEq(),
            };
          },
        };
      }
      if (table === "job_required_skills") {
        return {
          insert: (data: unknown) => {
            mockInsert(data);
            return mockInsert.mock.results[mockInsert.mock.results.length - 1] ?? { error: null };
          },
          delete: () => ({
            eq: (_field: string, _value: string) => mockDelete(),
          }),
        };
      }
      return {};
    },
  }),
}));

describe("JobDescriptionForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
    mockSingle.mockResolvedValue({
      data: { id: "job-456" },
      error: null,
    });
    mockInsert.mockReturnValue({ error: null });
    mockEq.mockResolvedValue({ error: null });
    mockDelete.mockResolvedValue({ error: null });
  });

  it("renders form with all required fields", () => {
    render(<JobDescriptionForm />);

    expect(screen.getByRole("form", { name: "Job description form" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Job Title/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
    expect(screen.getByLabelText("Qualifications")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Job Description" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+ Add Skill" })).toBeInTheDocument();
  });

  it("renders initial skill input row", () => {
    render(<JobDescriptionForm />);

    expect(screen.getByLabelText("Skill 1 name")).toBeInTheDocument();
    expect(screen.getByLabelText("Skill 1 importance")).toBeInTheDocument();
  });

  it("adds a new skill row when Add Skill is clicked", () => {
    render(<JobDescriptionForm />);

    fireEvent.click(screen.getByRole("button", { name: "+ Add Skill" }));

    expect(screen.getByLabelText("Skill 2 name")).toBeInTheDocument();
    expect(screen.getByLabelText("Skill 2 importance")).toBeInTheDocument();
  });

  it("removes a skill row when Remove is clicked", () => {
    render(<JobDescriptionForm />);

    // Add a second skill first
    fireEvent.click(screen.getByRole("button", { name: "+ Add Skill" }));
    expect(screen.getByLabelText("Skill 2 name")).toBeInTheDocument();

    // Remove the second skill
    fireEvent.click(screen.getByRole("button", { name: "Remove skill 2" }));
    expect(screen.queryByLabelText("Skill 2 name")).not.toBeInTheDocument();
  });

  it("disables Remove button when only one skill remains", () => {
    render(<JobDescriptionForm />);

    expect(screen.getByRole("button", { name: "Remove skill 1" })).toBeDisabled();
  });

  it("shows validation error when title is empty", async () => {
    render(<JobDescriptionForm />);

    // Fill in a skill but leave title empty
    fireEvent.change(screen.getByLabelText("Skill 1 name"), {
      target: { value: "React" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Job Description" }));

    await waitFor(() => {
      expect(screen.getByText("Title is required.")).toBeInTheDocument();
    });
  });

  it("shows validation error when no required skill is specified", async () => {
    render(<JobDescriptionForm />);

    // Fill title and description but leave skills empty
    fireEvent.change(screen.getByLabelText(/Job Title/), {
      target: { value: "Software Engineer" },
    });
    fireEvent.change(screen.getByLabelText(/Description/), {
      target: { value: "Build things" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Job Description" }));

    await waitFor(() => {
      expect(screen.getByText("At least one required skill must be specified.")).toBeInTheDocument();
    });
  });

  it("shows validation error when all skills are preferred (none required)", async () => {
    render(<JobDescriptionForm />);

    fireEvent.change(screen.getByLabelText(/Job Title/), {
      target: { value: "Software Engineer" },
    });
    fireEvent.change(screen.getByLabelText(/Description/), {
      target: { value: "Build things" },
    });
    fireEvent.change(screen.getByLabelText("Skill 1 name"), {
      target: { value: "TypeScript" },
    });
    fireEvent.change(screen.getByLabelText("Skill 1 importance"), {
      target: { value: "preferred" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Job Description" }));

    await waitFor(() => {
      expect(screen.getByText("At least one required skill must be specified.")).toBeInTheDocument();
    });
  });

  it("shows error when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    render(<JobDescriptionForm />);

    fireEvent.change(screen.getByLabelText(/Job Title/), {
      target: { value: "Software Engineer" },
    });
    fireEvent.change(screen.getByLabelText(/Description/), {
      target: { value: "Build great software" },
    });
    fireEvent.change(screen.getByLabelText("Skill 1 name"), {
      target: { value: "React" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Job Description" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "You must be logged in to create a job description."
      );
    });
  });

  it("shows loading state while submitting", async () => {
    mockSingle.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ data: { id: "job-1" }, error: null }), 200))
    );

    render(<JobDescriptionForm />);

    fireEvent.change(screen.getByLabelText(/Job Title/), {
      target: { value: "Software Engineer" },
    });
    fireEvent.change(screen.getByLabelText(/Description/), {
      target: { value: "Build great software" },
    });
    fireEvent.change(screen.getByLabelText("Skill 1 name"), {
      target: { value: "React" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Job Description" }));

    expect(await screen.findByRole("button", { name: "Creating..." })).toBeDisabled();
  });

  it("pre-fills form fields in edit mode", () => {
    render(
      <JobDescriptionForm
        initialData={{
          id: "job-123",
          title: "Senior Engineer",
          description: "Lead development",
          qualifications: "5 years experience",
          skills: [
            { skill_name: "React", importance: "required" },
            { skill_name: "TypeScript", importance: "preferred" },
          ],
        }}
      />
    );

    expect(screen.getByLabelText(/Job Title/)).toHaveValue("Senior Engineer");
    expect(screen.getByLabelText(/Description/)).toHaveValue("Lead development");
    expect(screen.getByLabelText("Qualifications")).toHaveValue("5 years experience");
    expect(screen.getByLabelText("Skill 1 name")).toHaveValue("React");
    expect(screen.getByLabelText("Skill 2 name")).toHaveValue("TypeScript");
    expect(screen.getByRole("button", { name: "Update Job Description" })).toBeInTheDocument();
  });

  it("has proper aria attributes for accessibility", () => {
    render(<JobDescriptionForm />);

    const titleInput = screen.getByLabelText(/Job Title/);
    expect(titleInput).toHaveAttribute("aria-required", "true");

    const descInput = screen.getByLabelText(/Description/);
    expect(descInput).toHaveAttribute("aria-required", "true");
  });
});
