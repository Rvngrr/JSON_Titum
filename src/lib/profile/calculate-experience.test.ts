import { describe, it, expect } from "vitest";
import { calculateTotalYearsExperience } from "./calculate-experience";
import type { WorkExperienceEntry } from "@/types";

describe("calculateTotalYearsExperience", () => {
  it("returns 0 for empty array", () => {
    expect(calculateTotalYearsExperience([])).toBe(0);
  });

  it("returns 0 for entries without start dates", () => {
    const entries: WorkExperienceEntry[] = [
      { id: "1", title: "Dev", company: "Corp", startDate: "" },
    ];
    expect(calculateTotalYearsExperience(entries)).toBe(0);
  });

  it("calculates years for a single entry with start and end date", () => {
    const entries: WorkExperienceEntry[] = [
      {
        id: "1",
        title: "Developer",
        company: "TechCo",
        startDate: "2020-01",
        endDate: "2022-01",
        isCurrent: false,
      },
    ];
    // 24 months = 2 years
    expect(calculateTotalYearsExperience(entries)).toBe(2);
  });

  it("calculates years for a current position", () => {
    const now = new Date();
    const startYear = now.getFullYear() - 3;
    const startMonth = String(now.getMonth() + 1).padStart(2, "0");

    const entries: WorkExperienceEntry[] = [
      {
        id: "1",
        title: "Developer",
        company: "TechCo",
        startDate: `${startYear}-${startMonth}`,
        isCurrent: true,
      },
    ];
    // Should be approximately 3 years
    expect(calculateTotalYearsExperience(entries)).toBe(3);
  });

  it("merges overlapping periods correctly", () => {
    const entries: WorkExperienceEntry[] = [
      {
        id: "1",
        title: "Dev",
        company: "A",
        startDate: "2020-01",
        endDate: "2022-06",
        isCurrent: false,
      },
      {
        id: "2",
        title: "Dev",
        company: "B",
        startDate: "2021-01",
        endDate: "2023-01",
        isCurrent: false,
      },
    ];
    // Merged: 2020-01 to 2023-01 = 36 months = 3.0 years
    expect(calculateTotalYearsExperience(entries)).toBe(3);
  });

  it("sums non-overlapping periods", () => {
    const entries: WorkExperienceEntry[] = [
      {
        id: "1",
        title: "Dev",
        company: "A",
        startDate: "2018-01",
        endDate: "2019-01",
        isCurrent: false,
      },
      {
        id: "2",
        title: "Dev",
        company: "B",
        startDate: "2021-01",
        endDate: "2023-01",
        isCurrent: false,
      },
    ];
    // 12 months + 24 months = 36 months = 3.0 years
    expect(calculateTotalYearsExperience(entries)).toBe(3);
  });

  it("handles 6-month increments correctly", () => {
    const entries: WorkExperienceEntry[] = [
      {
        id: "1",
        title: "Intern",
        company: "StartupX",
        startDate: "2023-01",
        endDate: "2023-07",
        isCurrent: false,
      },
    ];
    // 6 months = 0.5 years
    expect(calculateTotalYearsExperience(entries)).toBe(0.5);
  });
});
