/**
 * Display utility functions for the Learning Paths feature.
 *
 * Handles course title truncation, recommendation sorting/capping,
 * and accessible label generation for course links.
 */

import type { CourseRecommendation } from './types';

/**
 * Truncates a course title to 80 characters with an ellipsis suffix.
 * If the title is 80 characters or fewer, it is returned unchanged.
 *
 * @param title - The course title to truncate
 * @returns The original title if <= 80 chars, or first 80 chars + "..." (83 total)
 */
export function truncateTitle(title: string): string {
  if (title.length > 80) {
    return title.slice(0, 80) + '...';
  }
  return title;
}

/**
 * Sorts course recommendations by impactScore in descending order
 * and caps the result at the specified maximum number of items.
 *
 * @param courses - Array of course recommendations to sort and cap
 * @param maxItems - Maximum number of items to return (default: 10)
 * @returns A new sorted and capped array of course recommendations
 */
export function sortAndCapRecommendations(
  courses: CourseRecommendation[],
  maxItems: number = 10
): CourseRecommendation[] {
  return [...courses]
    .sort((a, b) => b.impactScore - a.impactScore)
    .slice(0, maxItems);
}

/**
 * Generates an accessible aria-label string for a course link.
 * The label contains both the course title (truncated if needed)
 * and the platform name.
 *
 * @param title - The course title
 * @param platform - The platform name (e.g., "Coursera", "Udemy")
 * @returns An aria-label string containing both title and platform
 */
export function generateAriaLabel(title: string, platform: string): string {
  const displayTitle = truncateTitle(title);
  return `${displayTitle} on ${platform}`;
}
