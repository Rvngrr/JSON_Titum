import type { WorkExperienceEntry } from "@/types";

/**
 * Calculate total years of experience from work experience entries.
 * Handles overlapping periods by computing unique months worked.
 * Returns the value rounded to 1 decimal place.
 */
export function calculateTotalYearsExperience(
  entries: WorkExperienceEntry[]
): number {
  if (!entries || entries.length === 0) return 0;

  // Convert entries to date ranges (month granularity)
  const ranges: Array<{ start: number; end: number }> = [];

  for (const entry of entries) {
    if (!entry.startDate) continue;

    const [startYear, startMonth] = entry.startDate.split("-").map(Number);
    if (!startYear || !startMonth) continue;

    const startMonths = startYear * 12 + startMonth;

    let endMonths: number;
    if (entry.isCurrent) {
      const now = new Date();
      endMonths = now.getFullYear() * 12 + (now.getMonth() + 1);
    } else if (entry.endDate) {
      const [endYear, endMonth] = entry.endDate.split("-").map(Number);
      if (!endYear || !endMonth) continue;
      endMonths = endYear * 12 + endMonth;
    } else {
      // No end date and not current - skip or treat as current month
      const now = new Date();
      endMonths = now.getFullYear() * 12 + (now.getMonth() + 1);
    }

    if (endMonths >= startMonths) {
      ranges.push({ start: startMonths, end: endMonths });
    }
  }

  if (ranges.length === 0) return 0;

  // Merge overlapping ranges to avoid double-counting
  ranges.sort((a, b) => a.start - b.start);
  const merged: Array<{ start: number; end: number }> = [ranges[0]];

  for (let i = 1; i < ranges.length; i++) {
    const last = merged[merged.length - 1];
    if (ranges[i].start <= last.end) {
      last.end = Math.max(last.end, ranges[i].end);
    } else {
      merged.push(ranges[i]);
    }
  }

  // Sum total months
  const totalMonths = merged.reduce(
    (sum, range) => sum + (range.end - range.start),
    0
  );

  // Convert to years, rounded to 1 decimal place
  return Math.round((totalMonths / 12) * 10) / 10;
}
