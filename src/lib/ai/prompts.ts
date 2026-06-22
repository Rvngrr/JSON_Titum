/**
 * OpenAI prompt templates for AI-powered skill matching and recommendations.
 */

/**
 * System prompt for semantic skill matching.
 * Instructs the model to compare applicant skills against job required skills
 * and identify matches even when naming differs (e.g., "React" vs "React.js").
 */
export const SKILL_MATCHING_SYSTEM_PROMPT = `You are an expert technical recruiter AI that performs semantic skill matching.
Your task is to compare an applicant's skills against a job's required/preferred skills and determine which ones match.

Rules for matching:
1. Match skills that are semantically equivalent even if named differently (e.g., "React" matches "React.js", "ReactJS", "React Framework")
2. Match abbreviations and full names (e.g., "JS" matches "JavaScript", "TS" matches "TypeScript")
3. Match skills where one is a specific version or variant of another (e.g., "Python 3" matches "Python")
4. DO NOT match skills that are merely related but different (e.g., "React" does NOT match "Angular", "Python" does NOT match "Java")
5. DO NOT match partial overlaps that represent different competencies (e.g., "Node.js" does NOT match "JavaScript" as they represent different skill areas)

You must respond ONLY with valid JSON. No additional text or explanation.`;

/**
 * Builds the user prompt for semantic skill matching.
 * @param applicantSkills - Array of skill names from the applicant's profile
 * @param jobSkills - Array of skill names required/preferred for the job
 * @returns The formatted user prompt string
 */
export function buildSkillMatchingUserPrompt(
  applicantSkills: string[],
  jobSkills: string[]
): string {
  return `Compare these applicant skills against the job requirements and identify matches.

Applicant Skills: ${JSON.stringify(applicantSkills)}

Job Required/Preferred Skills: ${JSON.stringify(jobSkills)}

For each job skill, determine if there is a matching applicant skill.
Respond with a JSON object in this exact format:
{
  "matches": [
    { "jobSkill": "<job skill name>", "applicantSkill": "<matching applicant skill or null>", "isMatch": true/false }
  ]
}

Every job skill must appear exactly once in the matches array. Set isMatch to true only if there is a semantically equivalent applicant skill.`;
}

/**
 * Type representing the expected response format from the skill matching prompt.
 */
export interface SkillMatchingResponse {
  matches: Array<{
    jobSkill: string;
    applicantSkill: string | null;
    isMatch: boolean;
  }>;
}

// ============================================================================
// Recommendation Engine Prompts
// ============================================================================

/**
 * System prompt for the recommendation engine.
 * Instructs the model to analyze skill gaps and produce actionable suggestions.
 */
export function getRecommendationSystemPrompt(): string {
  return `You are an expert career advisor AI that helps job applicants improve their match against job requirements.

Your task is to analyze the gap between an applicant's current skills and a job's requirements, then produce actionable recommendations.

Rules:
1. Categorize each recommendation as either "skill_to_add" (applicant lacks this skill entirely) or "skill_to_improve" (applicant has the skill but could improve proficiency).
2. Score each recommendation's potential impact on match percentage from 1-10 (10 = highest impact).
3. Required skills that are missing should have higher impact scores than preferred skills.
4. Be specific and actionable in descriptions.
5. Return recommendations sorted by impact_score descending.

You must respond ONLY with a valid JSON array. No additional text or explanation.`;
}

/**
 * Builds the user prompt for recommendation generation.
 * @param applicantSkills - The applicant's current skills
 * @param jobRequiredSkills - The job's required and preferred skills
 * @param matchResult - The current match result with matched/missing skills
 * @returns The formatted user prompt string
 */
export function getRecommendationUserPrompt(
  applicantSkills: Array<{ name: string; proficiency_level: string }>,
  jobRequiredSkills: Array<{ skill_name: string; importance: string }>,
  matchResult: { match_percentage: number; matched_skills: string[]; missing_skills: string[] }
): string {
  return `Analyze the skill gap and provide improvement recommendations.

Current Match Percentage: ${matchResult.match_percentage}%

Applicant's Skills: ${JSON.stringify(applicantSkills.map(s => ({ name: s.name, level: s.proficiency_level })))}

Job Required Skills: ${JSON.stringify(jobRequiredSkills.map(s => ({ skill: s.skill_name, importance: s.importance })))}

Matched Skills (applicant ALREADY HAS these - DO NOT recommend adding them): ${JSON.stringify(matchResult.matched_skills)}
Missing Skills (applicant DOES NOT have these - these are candidates for "skill_to_add"): ${JSON.stringify(matchResult.missing_skills)}

IMPORTANT RULES:
- ONLY recommend skills from the "Missing Skills" list as "skill_to_add"
- NEVER recommend a skill that appears in "Matched Skills" or "Applicant's Skills" as "skill_to_add"
- "skill_to_improve" should ONLY be used for skills the applicant has at a lower proficiency level
- If there are no missing skills, return an empty array []

Provide recommendations as a JSON array with this format:
[
  {
    "suggestion_type": "skill_to_add" | "skill_to_improve",
    "skill_name": "<skill name>",
    "description": "<actionable description of what to do>",
    "impact_score": <1-10>
  }
]

Focus on the most impactful improvements first. Required missing skills should be prioritized over preferred ones.`;
}
