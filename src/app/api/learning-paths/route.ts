/**
 * GET /api/learning-paths
 *
 * Returns personalized course recommendations for the authenticated applicant,
 * grouped by skill gap. Merges missing skills from match results and career goal
 * role readiness, maps them to verified courses, and caps at 3 per skill gap.
 *
 * Responses:
 * - 200: LearningPathResponse with grouped recommendations (or empty array if no skills)
 * - 401: User is not authenticated
 * - 500: Internal server error
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8
 */

import { createClient } from "@/lib/supabase/server";
import { aggregateSkillGaps } from "@/lib/learning-paths/skill-gap-aggregator";
import { mapSkillsToCourses } from "@/lib/learning-paths/course-catalog";
import { isValidCourseUrl } from "@/lib/learning-paths/url-validator";
import type { MatchResult } from "@/types";
import type {
  LearningPathResponse,
  SkillGapGroup,
  CourseRecommendation,
  HiddenGemInfo,
  HiddenGemJob,
  UrgencySummary,
} from "@/lib/learning-paths/types";

/** Maximum number of courses to return per skill gap in the API response */
const MAX_COURSES_PER_SKILL_GAP = 3;

/** Typical skills expected for each aspired role (role readiness calculation) */
const ROLE_EXPECTED_SKILLS: Record<string, string[]> = {
  "Data Analyst": ["SQL", "Python", "Excel", "Data Analysis", "Statistics", "Tableau", "Power BI", "R"],
  "Software Developer": ["JavaScript", "Python", "Git", "REST APIs", "SQL", "React", "Node.js", "TypeScript"],
  "Information Technology": ["Linux", "Networking", "Troubleshooting", "Windows", "Cloud Services", "Security", "Python"],
  "Advertising": ["Marketing", "Communication", "Social Media", "Analytics", "SEO", "Content Writing", "Adobe Creative Suite"],
  "Software Media": ["Video Editing", "Adobe Premiere", "After Effects", "Photoshop", "UI/UX Design", "Figma", "Motion Graphics"],
  "Customer Svc": ["Communication", "Problem-Solving", "CRM", "Empathy", "Multitasking", "Patience", "Conflict Resolution"],
  "Cybersecurity": ["Networking", "Linux", "Python", "Penetration Testing", "Firewalls", "SIEM", "Cryptography", "Risk Assessment"],
  "Web Developer": ["HTML", "CSS", "JavaScript", "React", "Node.js", "Git", "Responsive Design", "TypeScript"],
  "AI/ML Engineer": ["Python", "Machine Learning", "TensorFlow", "Deep Learning", "Statistics", "NLP", "PyTorch", "Data Analysis"],
  "UX Designer": ["Figma", "User Research", "Wireframing", "Prototyping", "UI/UX Design", "Adobe XD", "Communication"],
};

/**
 * Computes role readiness missing skills for a given career goal against user skills.
 */
function computeRoleReadinessMissing(
  careerGoal: string,
  userSkills: string[]
): string[] {
  const expectedSkills = ROLE_EXPECTED_SKILLS[careerGoal];
  if (!expectedSkills) return [];

  const userSkillsLower = userSkills.map((s) => s.toLowerCase());

  return expectedSkills.filter(
    (expected) =>
      !userSkillsLower.some(
        (us) =>
          us.includes(expected.toLowerCase()) ||
          expected.toLowerCase().includes(us)
      )
  );
}

export async function GET() {
  try {
    // 1. Authenticate the user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json(
        { success: false, data: [], error: "Authentication required" } satisfies LearningPathResponse,
        { status: 401 }
      );
    }

    // 2. Fetch match_results for the user
    const { data: matchResults, error: matchError } = await supabase
      .from("match_results")
      .select("id, applicant_id, job_description_id, match_percentage, matched_skills, missing_skills, calculated_at")
      .eq("applicant_id", user.id);

    if (matchError) {
      console.error("Failed to fetch match results:", matchError);
      return Response.json(
        { success: false, data: [], error: "Failed to generate recommendations" } satisfies LearningPathResponse,
        { status: 500 }
      );
    }

    // 3. Fetch work_preferences (career goal) and skill_profile_id from skill_profiles
    const { data: profile, error: profileError } = await supabase
      .from("skill_profiles")
      .select("id, work_preferences")
      .eq("user_id", user.id)
      .single();

    if (profileError && profileError.code !== "PGRST116") {
      // PGRST116 = no rows found, which is acceptable (user has no profile yet)
      console.error("Failed to fetch skill profile:", profileError);
      return Response.json(
        { success: false, data: [], error: "Failed to generate recommendations" } satisfies LearningPathResponse,
        { status: 500 }
      );
    }

    // 4. Determine career goal and compute role readiness missing skills
    let roleReadiness: { missing: string[] } | null = null;

    if (profile?.work_preferences) {
      const prefs = profile.work_preferences as Record<string, unknown>;
      const careerGoal = prefs.careerGoal as string | undefined;

      if (careerGoal && ROLE_EXPECTED_SKILLS[careerGoal]) {
        // Fetch user's current skills to compute role readiness
        const { data: skillsData } = await supabase
          .from("skills")
          .select("name")
          .eq("skill_profile_id", profile.id);

        const userSkills = skillsData?.map((s: { name: string }) => s.name) ?? [];
        const missingSkills = computeRoleReadinessMissing(careerGoal, userSkills);

        if (missingSkills.length > 0) {
          roleReadiness = { missing: missingSkills };
        }
      }
    }

    // 5. Aggregate skill gaps from match results and role readiness
    const typedMatchResults = (matchResults ?? []) as MatchResult[];
    const aggregatedGaps = aggregateSkillGaps(typedMatchResults, roleReadiness);

    // If no skill gaps, return empty array with 200
    if (aggregatedGaps.length === 0) {
      return Response.json(
        { success: true, data: [] } satisfies LearningPathResponse,
        { status: 200 }
      );
    }

    // 5.5 Compute Hidden Gem data — jobs that would be "unlocked" by learning each skill
    // A hidden gem is a job where the applicant is close to qualifying (match >= 60%)
    // and this specific skill is one of the missing skills
    const hiddenGemThreshold = 60; // minimum match % to be considered "almost qualified"
    const jobTitleMap = new Map<string, string>();

    // Fetch job titles for hidden gem display
    if (typedMatchResults.length > 0) {
      const jobIds = [...new Set(typedMatchResults.map((m) => m.job_description_id))];
      const { data: jobsData } = await supabase
        .from("job_descriptions")
        .select("id, title")
        .in("id", jobIds);

      if (jobsData) {
        for (const job of jobsData) {
          jobTitleMap.set(job.id, job.title);
        }
      }
    }

    // For each skill gap, find "near-miss" jobs
    const skillHiddenGems = new Map<string, HiddenGemInfo>();

    for (const gap of aggregatedGaps) {
      const skillLower = gap.skillName.toLowerCase();
      const nearMissJobs: HiddenGemJob[] = [];

      for (const match of typedMatchResults) {
        // Job must be above threshold (almost qualified)
        if (match.match_percentage < hiddenGemThreshold) continue;

        // This skill must be in the job's missing skills
        const hasMissingSkill = (match.missing_skills ?? []).some(
          (s) => s.toLowerCase() === skillLower
        );
        if (!hasMissingSkill) continue;

        // The fewer missing skills, the more "unlockable" — prioritize jobs missing 1-3 skills
        const missingCount = (match.missing_skills ?? []).length;
        if (missingCount > 3) continue;

        // Calculate projected match (approximate: add one skill's worth)
        const totalSkills = (match.matched_skills?.length ?? 0) + missingCount;
        const projectedMatch = totalSkills > 0
          ? Math.min(100, Math.round(((match.matched_skills?.length ?? 0) + 1) / totalSkills * 100))
          : match.match_percentage;

        nearMissJobs.push({
          jobId: match.job_description_id,
          title: jobTitleMap.get(match.job_description_id) ?? "Untitled Position",
          currentMatch: match.match_percentage,
          projectedMatch,
        });
      }

      // Sort by current match descending (closest to qualifying first)
      nearMissJobs.sort((a, b) => b.currentMatch - a.currentMatch);

      if (nearMissJobs.length > 0) {
        skillHiddenGems.set(gap.skillName, {
          unlockableJobCount: nearMissJobs.length,
          topJobs: nearMissJobs.slice(0, 3),
        });
      }
    }

    // 6. Map aggregated skills to courses from the catalog
    const skillNames = aggregatedGaps.map((gap) => gap.skillName);
    const skillCourseMap = mapSkillsToCourses(skillNames);

    // 7. Build response groups, filtering URLs and capping at 3 per skill gap
    const groups: SkillGapGroup[] = [];

    for (const gap of aggregatedGaps) {
      const catalogEntries = skillCourseMap.get(gap.skillName);

      // Omit skills without catalog entries (Requirement 6.7)
      if (!catalogEntries || catalogEntries.length === 0) {
        continue;
      }

      // Filter URLs through validator (Requirement 6.4)
      const validEntries = catalogEntries.filter((entry) =>
        isValidCourseUrl(entry.url)
      );

      if (validEntries.length === 0) {
        continue;
      }

      // Map to CourseRecommendation with impactScore
      const recommendations: CourseRecommendation[] = validEntries.map((entry) => ({
        title: entry.title,
        platform: entry.platform,
        url: entry.url,
        skill: gap.skillName,
        durationHours: entry.durationHours,
        hasCertificate: entry.hasCertificate,
        impactScore: calculateImpactScore(gap.jobCount, gap.totalJobs),
      }));

      // Sort by impactScore descending, then cap at 3 (Requirement 6.3)
      recommendations.sort((a, b) => b.impactScore - a.impactScore);
      const capped = recommendations.slice(0, MAX_COURSES_PER_SKILL_GAP);

      groups.push({
        skill: gap,
        courses: capped,
        hiddenGems: skillHiddenGems.get(gap.skillName),
      });
    }

    // 8. Build urgency summary
    let urgency: UrgencySummary | undefined;
    const totalHiddenGems = [...skillHiddenGems.values()].reduce(
      (sum, info) => sum + info.unlockableJobCount, 0
    );

    if (totalHiddenGems > 0) {
      // Find the skill that unlocks the most jobs
      let topSkill = "";
      let topSkillUnlocks = 0;
      for (const [skill, info] of skillHiddenGems.entries()) {
        if (info.unlockableJobCount > topSkillUnlocks) {
          topSkill = skill;
          topSkillUnlocks = info.unlockableJobCount;
        }
      }
      urgency = { totalHiddenGems, topSkill, topSkillUnlocks };
    }

    // 9. Return successful response
    return Response.json(
      { success: true, data: groups, urgency } satisfies LearningPathResponse,
      { status: 200 }
    );
  } catch (error) {
    console.error("Learning paths API error:", error);
    return Response.json(
      { success: false, data: [], error: "Failed to generate recommendations" } satisfies LearningPathResponse,
      { status: 500 }
    );
  }
}

/**
 * Calculates an impact score for a course based on the skill's job count frequency.
 * Higher frequency skills get higher impact scores.
 *
 * Score is normalized to a 1-10 scale based on the ratio of jobCount to totalJobs.
 * If totalJobs is 0, returns a baseline score of 5.
 */
function calculateImpactScore(jobCount: number, totalJobs: number): number {
  if (totalJobs === 0) {
    return 5;
  }
  // Normalize to 1-10 scale
  const ratio = jobCount / totalJobs;
  return Math.max(1, Math.min(10, Math.round(ratio * 10)));
}
