import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SkillProfile from "./SkillProfile";

// Mock Supabase client
const mockGetUser = vi.fn();

function createChain(finalResult: unknown) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(finalResult),
  };
  // Allow chaining: each method returns chain itself
  chain.select.mockReturnValue(chain);
  chain.insert.mockReturnValue(chain);
  chain.update.mockReturnValue(chain);
  chain.delete.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  return chain;
}

let fromHandler: (table: string) => ReturnType<typeof createChain>;

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: (table: string) => fromHandler(table),
  }),
}));

const mockSkillProfile = {
  id: "sp-1",
  user_id: "user-123",
  resume_file_path: null,
  raw_resume_text: null,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const mockSkills = [
  {
    id: "skill-1",
    skill_profile_id: "sp-1",
    name: "React",
    proficiency_level: "advanced",
    source: "resume_parsed",
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "skill-2",
    skill_profile_id: "sp-1",
    name: "TypeScript",
    proficiency_level: "intermediate",
    source: "manual",
    created_at: "2024-01-02T00:00:00Z",
  },
];

describe("SkillProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    // Default setup: profile exists, skills loaded
    fromHandler = (table: string) => {
      if (table === "skill_profiles") {
        const chain = createChain({ data: mockSkillProfile, error: null });
        return chain;
      }
      if (table === "skills") {
        const chain = createChain({ data: mockSkills, error: null });
        // Override: for skills list, the order call resolves directly (no single)
        chain.order.mockResolvedValue({ data: mockSkills, error: null });
        return chain;
      }
      return createChain({ data: null, error: null });
    };
  });

  it("renders loading state initially", () => {
    render(<SkillProfile />);
    expect(screen.getByText("Loading skill profile...")).toBeInTheDocument();
  });

  it("displays skills with source indicators", async () => {
    render(<SkillProfile />);

    await waitFor(() => {
      expect(screen.getByText("React")).toBeInTheDocument();
    });

    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.getByText("Parsed from resume")).toBeInTheDocument();
    expect(screen.getByText("Manually added")).toBeInTheDocument();
  });

  it("displays proficiency levels as badges", async () => {
    render(<SkillProfile />);

    await waitFor(() => {
      expect(screen.getByText("React")).toBeInTheDocument();
    });

    // Proficiency badges are rendered as span elements within the skills list
    const skillsList = screen.getByLabelText("Skills list");
    const advancedBadges = skillsList.querySelectorAll("span");
    const badgeTexts = Array.from(advancedBadges).map((el) => el.textContent);
    expect(badgeTexts).toContain("Advanced");
    expect(badgeTexts).toContain("Intermediate");
  });

  it("shows skill count in header", async () => {
    render(<SkillProfile />);

    await waitFor(() => {
      expect(screen.getByText("(2)")).toBeInTheDocument();
    });
  });

  it("shows empty state when no skills exist", async () => {
    fromHandler = (table: string) => {
      if (table === "skill_profiles") {
        return createChain({ data: mockSkillProfile, error: null });
      }
      if (table === "skills") {
        const chain = createChain({ data: [], error: null });
        chain.order.mockResolvedValue({ data: [], error: null });
        return chain;
      }
      return createChain({ data: null, error: null });
    };

    render(<SkillProfile />);

    await waitFor(() => {
      expect(screen.getByText("No skills added yet.")).toBeInTheDocument();
    });
  });

  it("shows error when not authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    render(<SkillProfile />);

    await waitFor(() => {
      expect(
        screen.getByText("You must be logged in to view your skill profile.")
      ).toBeInTheDocument();
    });
  });

  it("renders add skill form with inputs and button", async () => {
    render(<SkillProfile />);

    await waitFor(() => {
      expect(screen.getByLabelText("Skill Name")).toBeInTheDocument();
    });

    expect(screen.getByLabelText("Proficiency")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add skill" })).toBeInTheDocument();
  });

  it("prevents adding a skill with empty name", async () => {
    render(<SkillProfile />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Add skill" })).toBeInTheDocument();
    });

    // Button is disabled when input is empty
    const addButton = screen.getByRole("button", { name: "Add skill" });
    expect(addButton).toBeDisabled();
  });

  it("prevents adding duplicate skill names", async () => {
    render(<SkillProfile />);

    await waitFor(() => {
      expect(screen.getByText("React")).toBeInTheDocument();
    });

    const input = screen.getByLabelText("Skill Name");
    fireEvent.change(input, { target: { value: "react" } });

    const addButton = screen.getByRole("button", { name: "Add skill" });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(
        screen.getByText("This skill already exists in your profile.")
      ).toBeInTheDocument();
    });
  });

  it("has remove buttons for each skill", async () => {
    render(<SkillProfile />);

    await waitFor(() => {
      expect(screen.getByText("React")).toBeInTheDocument();
    });

    expect(screen.getByLabelText("Remove skill: React")).toBeInTheDocument();
    expect(screen.getByLabelText("Remove skill: TypeScript")).toBeInTheDocument();
  });

  it("has accessible section label", () => {
    render(<SkillProfile />);
    expect(screen.getByLabelText("Skill profile")).toBeInTheDocument();
  });
});
