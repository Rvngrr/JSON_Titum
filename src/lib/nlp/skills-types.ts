/**
 * Shared types for the Skills Taxonomy Module.
 * Extracted to avoid circular dependencies between skills-taxonomy.ts and multi-industry-skills.ts.
 */

export type SkillCategory =
  | 'Programming Languages'
  | 'Frameworks'
  | 'Cloud Platforms'
  | 'Databases'
  | 'DevOps'
  | 'Data Science'
  | 'Design'
  | 'Soft Skills'
  | 'Testing'
  | 'Security'
  | 'Mobile'
  | 'Culinary & Hospitality'
  | 'Education & Teaching'
  | 'Construction & Trades'
  | 'Agriculture'
  | 'Automotive'
  | 'Aviation'
  | 'Fitness & Wellness'
  | 'Sales & Marketing'
  | 'Human Resources'
  | 'Legal'
  | 'Arts & Creative'
  | 'Engineering'
  | 'Accounting & Finance'
  | 'Healthcare Clinical'
  | 'Manufacturing'
  | 'Logistics & Supply Chain'
  | 'Other';

export type IndustryId =
  | 'software-engineering'
  | 'data-science'
  | 'devops'
  | 'finance'
  | 'healthcare'
  | 'cybersecurity'
  | 'mobile-development'
  | 'game-development'
  | 'culinary-hospitality'
  | 'education'
  | 'construction'
  | 'agriculture'
  | 'automotive'
  | 'aviation'
  | 'fitness-wellness'
  | 'sales-marketing'
  | 'human-resources'
  | 'legal'
  | 'arts-creative'
  | 'engineering'
  | 'accounting'
  | 'manufacturing'
  | 'logistics'
  | 'public-relations';

export interface SkillEntry {
  canonical: string;
  synonyms: string[];
  category: SkillCategory;
  industries: IndustryId[];
}
