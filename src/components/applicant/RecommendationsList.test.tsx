import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import RecommendationsList from "./RecommendationsList";
import { Recommendation } from "@/types";

const makeRecommendation = (
  overrides: Partial<Recommendation> = {}
): Recommendation => ({
  id: "rec-1",
  applicant_id: "user-1",
  job_description_id: "job-1",
  suggestion_type: "skill_to_add",
  skill_name: "Docker",
  description: "Learn containerization with Docker",
  impact_score: 8,
  created_at: "2024-01-01T00:00:00Z",
  ...overrides,
});

const sampleRecommendations: Recommendation[] = [
  makeRecommendation({
    id: "rec-1",
    suggestion_type: "skill_to_add",
    skill_name: "Docker",
    description: "Learn containerization with Docker",
    impact_score: 8,
  }),
  makeRecommendation({
    id: "rec-2",
    suggestion_type: "skill_to_improve",
    skill_name: "TypeScript",
    description: "Strengthen TypeScript advanced patterns",
    impact_score: 9,
  }),
  makeRecommendation({
    id: "rec-3",
    suggestion_type: "skill_to_add",
    skill_name: "Kubernetes",
    description: "Learn container orchestration",
    impact_score: 5,
  }),
  makeRecommendation({
    id: "rec-4",
    suggestion_type: "skill_to_improve",
    skill_name: "React",
    description: "Improve React performance optimization skills",
    impact_score: 7,
  }),
];

describe("RecommendationsList", () => {
  it("renders fully matched message when match is 100%", () => {
    render(
      <RecommendationsList
        recommendations={[]}
        matchPercentage={100}
        loading={false}
        error={null}
      />
    );

    expect(
      screen.getByText("Your profile fully matches the job requirements!")
    ).toBeInTheDocument();
    expect(
      screen.getByText("No additional skills are needed for this position.")
    ).toBeInTheDocument();
  });

  it("renders empty state when no recommendations available", () => {
    render(
      <RecommendationsList
        recommendations={[]}
        matchPercentage={60}
        loading={false}
        error={null}
      />
    );

    expect(
      screen.getByText("No recommendations available yet.")
    ).toBeInTheDocument();
  });

  it("renders loading state", () => {
    render(
      <RecommendationsList
        recommendations={[]}
        matchPercentage={null}
        loading={true}
        error={null}
      />
    );

    expect(
      screen.getByText("Generating recommendations...")
    ).toBeInTheDocument();
  });

  it("renders error state", () => {
    render(
      <RecommendationsList
        recommendations={[]}
        matchPercentage={null}
        loading={false}
        error="Failed to generate recommendations"
      />
    );

    expect(
      screen.getByText("Failed to generate recommendations")
    ).toBeInTheDocument();
  });

  it("categorizes recommendations as 'Skills to Add' and 'Skills to Improve'", () => {
    render(
      <RecommendationsList
        recommendations={sampleRecommendations}
        matchPercentage={65}
        loading={false}
        error={null}
      />
    );

    expect(screen.getByText("Skills to Add")).toBeInTheDocument();
    expect(screen.getByText("Skills to Improve")).toBeInTheDocument();
  });

  it("displays skill names and descriptions", () => {
    render(
      <RecommendationsList
        recommendations={sampleRecommendations}
        matchPercentage={65}
        loading={false}
        error={null}
      />
    );

    expect(screen.getByText("Docker")).toBeInTheDocument();
    expect(screen.getByText("Learn containerization with Docker")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(
      screen.getByText("Strengthen TypeScript advanced patterns")
    ).toBeInTheDocument();
  });

  it("orders recommendations by impact score within each category (highest first)", () => {
    render(
      <RecommendationsList
        recommendations={sampleRecommendations}
        matchPercentage={65}
        loading={false}
        error={null}
      />
    );

    // "Skills to Add" list: Docker (8) should come before Kubernetes (5)
    const addList = screen.getByLabelText("Skills to add");
    const addItems = addList.querySelectorAll("li");
    expect(addItems[0]).toHaveTextContent("Docker");
    expect(addItems[1]).toHaveTextContent("Kubernetes");

    // "Skills to Improve" list: TypeScript (9) before React (7)
    const improveList = screen.getByLabelText("Skills to improve");
    const improveItems = improveList.querySelectorAll("li");
    expect(improveItems[0]).toHaveTextContent("TypeScript");
    expect(improveItems[1]).toHaveTextContent("React");
  });

  it("displays impact scores for each recommendation", () => {
    render(
      <RecommendationsList
        recommendations={sampleRecommendations}
        matchPercentage={65}
        loading={false}
        error={null}
      />
    );

    expect(screen.getByText("Impact: 8/10")).toBeInTheDocument();
    expect(screen.getByText("Impact: 9/10")).toBeInTheDocument();
    expect(screen.getByText("Impact: 5/10")).toBeInTheDocument();
    expect(screen.getByText("Impact: 7/10")).toBeInTheDocument();
  });

  it("shows only 'Skills to Add' section when no 'skill_to_improve' recommendations exist", () => {
    const addOnly = [
      makeRecommendation({ id: "r1", suggestion_type: "skill_to_add", skill_name: "Go" }),
    ];

    render(
      <RecommendationsList
        recommendations={addOnly}
        matchPercentage={50}
        loading={false}
        error={null}
      />
    );

    expect(screen.getByText("Skills to Add")).toBeInTheDocument();
    expect(screen.queryByText("Skills to Improve")).not.toBeInTheDocument();
  });

  it("shows only 'Skills to Improve' section when no 'skill_to_add' recommendations exist", () => {
    const improveOnly = [
      makeRecommendation({
        id: "r1",
        suggestion_type: "skill_to_improve",
        skill_name: "Python",
      }),
    ];

    render(
      <RecommendationsList
        recommendations={improveOnly}
        matchPercentage={80}
        loading={false}
        error={null}
      />
    );

    expect(screen.getByText("Skills to Improve")).toBeInTheDocument();
    expect(screen.queryByText("Skills to Add")).not.toBeInTheDocument();
  });

  it("has accessible section label", () => {
    render(
      <RecommendationsList
        recommendations={sampleRecommendations}
        matchPercentage={70}
        loading={false}
        error={null}
      />
    );

    expect(screen.getByLabelText("AI recommendations")).toBeInTheDocument();
  });
});
