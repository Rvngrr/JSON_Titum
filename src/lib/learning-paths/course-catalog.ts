/**
 * Course Catalog Module
 *
 * Static catalog of pre-verified course entries from approved learning platforms.
 * Provides skill-to-course mapping functions for the Learning Paths feature.
 *
 * Requirements: 7.1, 7.4, 6.7
 */

import { CatalogCourseEntry } from './types';

/**
 * Static catalog of pre-verified course entries covering common skills.
 * Each entry has been validated against approved URL patterns.
 */
export const COURSE_CATALOG: CatalogCourseEntry[] = [
  // Python
  {
    title: "Python for Everybody Specialization",
    platform: "Coursera",
    url: "https://coursera.org/learn/python-for-everybody",
    skills: ["Python", "Programming"],
    durationHours: 8,
    hasCertificate: true,
  },
  {
    title: "Complete Python Bootcamp From Zero to Hero",
    platform: "Udemy",
    url: "https://udemy.com/course/complete-python-bootcamp",
    skills: ["Python", "Programming"],
    durationHours: 22,
    hasCertificate: true,
  },
  {
    title: "Introduction to Python",
    platform: "DataCamp",
    url: "https://datacamp.com/courses/intro-to-python-for-data-science",
    skills: ["Python", "Data Analysis"],
    durationHours: 4,
    hasCertificate: true,
  },
  // JavaScript
  {
    title: "JavaScript Algorithms and Data Structures",
    platform: "Coursera",
    url: "https://coursera.org/learn/javascript-algorithms",
    skills: ["JavaScript", "Algorithms", "Programming"],
    durationHours: 10,
    hasCertificate: true,
  },
  {
    title: "The Complete JavaScript Course",
    platform: "Udemy",
    url: "https://udemy.com/course/the-complete-javascript-course",
    skills: ["JavaScript", "Web Development"],
    durationHours: 69,
    hasCertificate: true,
  },
  {
    title: "Learn JavaScript",
    platform: "Codecademy",
    url: "https://codecademy.com/learn/introduction-to-javascript",
    skills: ["JavaScript", "Programming"],
    durationHours: 15,
    hasCertificate: false,
  },
  // SQL
  {
    title: "SQL for Data Science",
    platform: "Coursera",
    url: "https://coursera.org/learn/sql-for-data-science",
    skills: ["SQL", "Data Analysis", "Databases"],
    durationHours: 16,
    hasCertificate: true,
  },
  {
    title: "The Complete SQL Bootcamp",
    platform: "Udemy",
    url: "https://udemy.com/course/the-complete-sql-bootcamp",
    skills: ["SQL", "Databases"],
    durationHours: 9,
    hasCertificate: true,
  },
  // React
  {
    title: "React Basics",
    platform: "Coursera",
    url: "https://coursera.org/learn/react-basics",
    skills: ["React", "JavaScript", "Web Development"],
    durationHours: 12,
    hasCertificate: true,
  },
  {
    title: "React The Complete Guide",
    platform: "Udemy",
    url: "https://udemy.com/course/react-the-complete-guide",
    skills: ["React", "JavaScript", "Web Development"],
    durationHours: 48,
    hasCertificate: true,
  },
  {
    title: "Learn React",
    platform: "Codecademy",
    url: "https://codecademy.com/learn/react-101",
    skills: ["React", "JavaScript"],
    durationHours: 10,
    hasCertificate: false,
  },
  // Data Analysis
  {
    title: "Google Data Analytics Professional Certificate",
    platform: "Coursera",
    url: "https://coursera.org/learn/google-data-analytics",
    skills: ["Data Analysis", "SQL", "Spreadsheets"],
    durationHours: 24,
    hasCertificate: true,
  },
  {
    title: "Data Analysis with Python",
    platform: "DataCamp",
    url: "https://datacamp.com/courses/data-analysis-with-python",
    skills: ["Data Analysis", "Python"],
    durationHours: 6,
    hasCertificate: true,
  },
  // Machine Learning
  {
    title: "Machine Learning by Stanford University",
    platform: "Coursera",
    url: "https://coursera.org/learn/machine-learning-stanford",
    skills: ["Machine Learning", "Python", "Data Science"],
    durationHours: 60,
    hasCertificate: true,
  },
  {
    title: "Machine Learning A-Z",
    platform: "Udemy",
    url: "https://udemy.com/course/machinelearning",
    skills: ["Machine Learning", "Python", "Data Science"],
    durationHours: 44,
    hasCertificate: true,
  },
  {
    title: "Machine Learning Fundamentals with Python",
    platform: "DataCamp",
    url: "https://datacamp.com/courses/machine-learning-fundamentals-python",
    skills: ["Machine Learning", "Python"],
    durationHours: 5,
    hasCertificate: true,
  },
  // TypeScript
  {
    title: "Understanding TypeScript",
    platform: "Udemy",
    url: "https://udemy.com/course/understanding-typescript",
    skills: ["TypeScript", "JavaScript", "Programming"],
    durationHours: 15,
    hasCertificate: true,
  },
  {
    title: "Learn TypeScript",
    platform: "Codecademy",
    url: "https://codecademy.com/learn/learn-typescript",
    skills: ["TypeScript", "JavaScript"],
    durationHours: 10,
    hasCertificate: false,
  },
  {
    title: "TypeScript: The Big Picture",
    platform: "Pluralsight",
    url: "https://pluralsight.com/courses/typescript-big-picture",
    skills: ["TypeScript", "JavaScript"],
    durationHours: 3,
    hasCertificate: true,
  },
  // Node.js
  {
    title: "Server-side Development with NodeJS",
    platform: "Coursera",
    url: "https://coursera.org/learn/server-side-nodejs",
    skills: ["Node.js", "JavaScript", "Web Development"],
    durationHours: 12,
    hasCertificate: true,
  },
  {
    title: "NodeJS The Complete Guide",
    platform: "Udemy",
    url: "https://udemy.com/course/nodejs-the-complete-guide",
    skills: ["Node.js", "JavaScript", "Web Development"],
    durationHours: 36,
    hasCertificate: true,
  },
  // Git
  {
    title: "Version Control with Git",
    platform: "Coursera",
    url: "https://coursera.org/learn/version-control-with-git",
    skills: ["Git", "Version Control"],
    durationHours: 8,
    hasCertificate: true,
  },
  {
    title: "Learn Git",
    platform: "Codecademy",
    url: "https://codecademy.com/learn/learn-git",
    skills: ["Git", "Version Control"],
    durationHours: 5,
    hasCertificate: false,
  },
  // CSS
  {
    title: "Advanced CSS and Sass",
    platform: "Udemy",
    url: "https://udemy.com/course/advanced-css-and-sass",
    skills: ["CSS", "Web Development", "Sass"],
    durationHours: 28,
    hasCertificate: true,
  },
  {
    title: "Learn CSS",
    platform: "Codecademy",
    url: "https://codecademy.com/learn/learn-css",
    skills: ["CSS", "Web Development"],
    durationHours: 8,
    hasCertificate: false,
  },
  // HTML
  {
    title: "HTML and CSS in Depth",
    platform: "Coursera",
    url: "https://coursera.org/learn/html-and-css-in-depth",
    skills: ["HTML", "CSS", "Web Development"],
    durationHours: 7,
    hasCertificate: true,
  },
  {
    title: "Learn HTML",
    platform: "Codecademy",
    url: "https://codecademy.com/learn/learn-html",
    skills: ["HTML", "Web Development"],
    durationHours: 6,
    hasCertificate: false,
  },
  // Linux
  {
    title: "Linux Administration",
    platform: "LinkedIn Learning",
    url: "https://linkedin.com/learning/linux-administration",
    skills: ["Linux", "System Administration"],
    durationHours: 12,
    hasCertificate: true,
  },
  {
    title: "Introduction to Linux",
    platform: "edX",
    url: "https://edx.org/learn/linux-fundamentals",
    skills: ["Linux", "System Administration"],
    durationHours: 14,
    hasCertificate: true,
  },
  // Networking
  {
    title: "Computer Networking",
    platform: "Coursera",
    url: "https://coursera.org/learn/computer-networking",
    skills: ["Networking", "IT"],
    durationHours: 20,
    hasCertificate: true,
  },
  {
    title: "Networking Foundations",
    platform: "LinkedIn Learning",
    url: "https://linkedin.com/learning/networking-foundations",
    skills: ["Networking", "IT"],
    durationHours: 6,
    hasCertificate: true,
  },
  // Communication
  {
    title: "Improving Communication Skills",
    platform: "Coursera",
    url: "https://coursera.org/learn/wharton-communication-skills",
    skills: ["Communication", "Leadership", "Soft Skills"],
    durationHours: 8,
    hasCertificate: true,
  },
  {
    title: "Communication Foundations",
    platform: "LinkedIn Learning",
    url: "https://linkedin.com/learning/communication-foundations",
    skills: ["Communication", "Soft Skills"],
    durationHours: 4,
    hasCertificate: true,
  },
];

// Maximum number of courses to return per skill
const MAX_COURSES_PER_SKILL = 5;

/**
 * Returns catalog course entries matching a given skill (case-insensitive).
 * Returns between 1 and 5 entries (capped at MAX_COURSES_PER_SKILL).
 *
 * @param skill - The skill name to search for
 * @returns Array of matching CatalogCourseEntry items (1-5 entries), or empty if no match
 */
export function getCoursesForSkill(skill: string): CatalogCourseEntry[] {
  const normalizedSkill = skill.toLowerCase();

  const matches = COURSE_CATALOG.filter((entry) =>
    entry.skills.some((s) => s.toLowerCase() === normalizedSkill)
  );

  return matches.slice(0, MAX_COURSES_PER_SKILL);
}

/**
 * Maps multiple skills to their corresponding course entries.
 * Skills with no catalog match are omitted from the result.
 *
 * @param skills - Array of skill names to map
 * @returns Map where keys are skill names and values are arrays of CatalogCourseEntry items
 */
export function mapSkillsToCourses(
  skills: string[]
): Map<string, CatalogCourseEntry[]> {
  const result = new Map<string, CatalogCourseEntry[]>();

  for (const skill of skills) {
    const courses = getCoursesForSkill(skill);
    if (courses.length > 0) {
      result.set(skill, courses);
    }
  }

  return result;
}
