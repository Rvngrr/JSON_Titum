/**
 * Hidden Gem Detector — pure local algorithm.
 *
 * Identifies high-growth opportunity jobs where an applicant has a 60-79%
 * match score but the missing skills are classified as easy-to-learn,
 * indicating less competition and quick upskilling potential.
 *
 * Requirements: 13.1, 13.2, 13.3, 13.4
 */

import type { HiddenGemResult } from './types';

// ---------------------------------------------------------------------------
// Skill Difficulty Catalog (seed data)
// ---------------------------------------------------------------------------

/**
 * In-memory skill difficulty catalog used for classification.
 * This serves as the initial seed data matching the `skill_difficulty_catalog`
 * database table schema. Skills not in this catalog default to 'hard'.
 */
const EASY_SKILLS: Set<string> = new Set([
  // Soft skills
  'communication',
  'public speaking',
  'teamwork',
  'time management',
  'problem solving',
  'critical thinking',
  'leadership',
  'collaboration',
  'presentation',
  'negotiation',
  'conflict resolution',
  'adaptability',
  'creativity',
  'interpersonal skills',
  'organizational skills',
  'attention to detail',
  'work ethic',

  // Tools & platforms
  'excel',
  'microsoft excel',
  'google suite',
  'google workspace',
  'google sheets',
  'jira',
  'slack',
  'trello',
  'notion',
  'confluence',
  'figma',
  'canva',
  'microsoft office',
  'powerpoint',
  'word',
  'microsoft word',
  'outlook',
  'teams',
  'zoom',
  'postman',
  'vs code',

  // Methodologies
  'agile',
  'scrum',
  'kanban',
  'waterfall',

  // Version control basics
  'git',
  'github',
  'gitlab',
  'bitbucket',

  // Basic technical
  'basic sql',
  'html',
  'css',
  'markdown',
  'json',
  'yaml',
  'xml',
  'rest api basics',
  'technical writing',
  'documentation',
  'npm',
  'eslint',
  'prettier',

  // Data entry & basic analysis
  'data entry',
  'basic data analysis',
  'google analytics',
  'seo basics',

  // Testing basics
  'manual testing',
  'functional testing',
  'debugging',
  'cross-browser testing',

  // Design basics
  'responsive design',
  'wireframing',
]);

const HARD_SKILLS: Set<string> = new Set([
  // Advanced CS & engineering
  'machine learning',
  'deep learning',
  'artificial intelligence',
  'system architecture',
  'distributed systems',
  'compiler design',
  'computer vision',
  'natural language processing',
  'blockchain',
  'cryptography',
  'quantum computing',
  'operating systems',

  // Complex languages & frameworks
  'rust',
  'haskell',
  'erlang',
  'scala',
  'assembly',
  'c++',
  'low-level programming',

  // Infrastructure & DevOps (complex)
  'kubernetes',
  'terraform',
  'aws architecture',
  'cloud architecture',
  'microservices architecture',
  'service mesh',
  'site reliability engineering',
  'devops',

  // Data engineering (advanced)
  'data pipeline architecture',
  'real-time streaming',
  'apache kafka',
  'apache spark',
  'data warehousing',
  'etl architecture',
  'data engineering',
  'data modeling',

  // Security (advanced)
  'penetration testing',
  'security architecture',
  'threat modeling',
  'reverse engineering',
  'security engineering',

  // Specialized domains
  'embedded systems',
  'fpga programming',
  'robotics',
  'signal processing',
  'real-time systems',
  'game development',

  // Data science (advanced)
  'statistics',
  'neural networks',
  'reinforcement learning',
  'database design',
]);

// ---------------------------------------------------------------------------
// Skill Difficulty Classification
// ---------------------------------------------------------------------------

/**
 * Classifies a skill as 'easy' or 'hard' based on the skill difficulty catalog.
 *
 * Classification logic:
 * 1. Normalize the skill name to lowercase for case-insensitive matching
 * 2. Check if the skill is in the EASY_SKILLS catalog → 'easy'
 * 3. Check if the skill is in the HARD_SKILLS catalog → 'hard'
 * 4. Default to 'hard' for unknown skills (conservative approach)
 *
 * @param skillName - The skill to classify
 * @returns 'easy' or 'hard'
 */
export function classifySkillDifficulty(skillName: string): 'easy' | 'hard' {
  const normalized = skillName.toLowerCase().trim();

  if (EASY_SKILLS.has(normalized)) {
    return 'easy';
  }

  if (HARD_SKILLS.has(normalized)) {
    return 'hard';
  }

  // Default to 'hard' for unknown skills — conservative approach ensures
  // Hidden Gem tagging only occurs when we're confident about learnability
  return 'hard';
}

// ---------------------------------------------------------------------------
// Hidden Gem Detection
// ---------------------------------------------------------------------------

/**
 * Detects whether a job listing is a "Hidden Gem" for an applicant.
 *
 * A Hidden Gem is a job where:
 * 1. The match percentage is between 60 and 79 (inclusive)
 * 2. More than 50% of the missing skills are classified as Easy_Skills
 *
 * Per Requirement 13.3: If ALL missing skills are easy, it's a Hidden Gem.
 * Per Requirement 13.4: If the MAJORITY (>50%) are easy, it's a Hidden Gem.
 *
 * @param matchPercentage - The applicant's match score for this job (0-100)
 * @param missingSkills - Array of skill names the applicant is missing
 * @returns Detailed breakdown of the Hidden Gem analysis
 */
export function detectHiddenGem(
  matchPercentage: number,
  missingSkills: string[]
): HiddenGemResult {
  // Classify each missing skill
  const easySkills: string[] = [];
  const hardSkills: string[] = [];

  for (const skill of missingSkills) {
    const difficulty = classifySkillDifficulty(skill);
    if (difficulty === 'easy') {
      easySkills.push(skill);
    } else {
      hardSkills.push(skill);
    }
  }

  // Calculate the easy skill ratio
  const totalMissing = missingSkills.length;
  const easySkillRatio = totalMissing > 0 ? easySkills.length / totalMissing : 0;

  // Determine Hidden Gem status:
  // 1. Match must be in [60, 79] range
  // 2. More than 50% of missing skills must be easy
  const isInRange = matchPercentage >= 60 && matchPercentage <= 79;
  const hasMajorityEasySkills = totalMissing > 0 && easySkillRatio > 0.5;
  const isHiddenGem = isInRange && hasMajorityEasySkills;

  return {
    isHiddenGem,
    matchPercentage,
    missingSkills,
    easySkills,
    hardSkills,
    easySkillRatio,
  };
}

// ---------------------------------------------------------------------------
// Exported catalog for database seeding
// ---------------------------------------------------------------------------

/**
 * Returns the full skill difficulty catalog as an array suitable for
 * database seeding of the `skill_difficulty_catalog` table.
 */
export function getSkillDifficultyCatalog(): Array<{
  skill_name: string;
  difficulty: 'easy' | 'hard';
  category: string;
}> {
  const catalog: Array<{
    skill_name: string;
    difficulty: 'easy' | 'hard';
    category: string;
  }> = [];

  Array.from(EASY_SKILLS).forEach((skill) => {
    catalog.push({
      skill_name: skill,
      difficulty: 'easy',
      category: categorizeSkill(skill),
    });
  });

  Array.from(HARD_SKILLS).forEach((skill) => {
    catalog.push({
      skill_name: skill,
      difficulty: 'hard',
      category: categorizeSkill(skill),
    });
  });

  return catalog;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Assigns a category to a skill for the seed data.
 */
function categorizeSkill(skill: string): string {
  const softSkills = [
    'communication', 'public speaking', 'teamwork', 'time management',
    'problem solving', 'critical thinking', 'leadership', 'collaboration',
    'presentation', 'negotiation', 'conflict resolution', 'adaptability',
    'creativity', 'interpersonal skills', 'organizational skills',
    'attention to detail', 'work ethic',
  ];
  if (softSkills.includes(skill)) return 'soft';

  const tools = [
    'excel', 'microsoft excel', 'google suite', 'google workspace',
    'google sheets', 'jira', 'slack', 'trello', 'notion', 'confluence',
    'figma', 'canva', 'microsoft office', 'powerpoint', 'word',
    'microsoft word', 'outlook', 'teams', 'zoom', 'postman', 'vs code',
    'git', 'github', 'gitlab', 'bitbucket', 'npm', 'eslint', 'prettier',
  ];
  if (tools.includes(skill)) return 'tool';

  const methodologies = ['agile', 'scrum', 'kanban', 'waterfall'];
  if (methodologies.includes(skill)) return 'methodology';

  const languages = [
    'rust', 'haskell', 'erlang', 'scala', 'assembly', 'c++',
    'low-level programming',
  ];
  if (languages.includes(skill)) return 'language';

  const infra = [
    'kubernetes', 'terraform', 'aws architecture', 'cloud architecture',
    'microservices architecture', 'service mesh', 'site reliability engineering',
    'devops',
  ];
  if (infra.includes(skill)) return 'infrastructure';

  const aiml = [
    'machine learning', 'deep learning', 'artificial intelligence',
    'computer vision', 'natural language processing', 'neural networks',
    'reinforcement learning',
  ];
  if (aiml.includes(skill)) return 'ai-ml';

  const security = [
    'penetration testing', 'security architecture', 'threat modeling',
    'reverse engineering', 'cryptography', 'security engineering',
  ];
  if (security.includes(skill)) return 'security';

  return 'technical';
}
