/**
 * GET /api/insights
 *
 * Generates personalized career insights for the authenticated applicant
 * based on their skills, match results, career goal, and skill gaps.
 * Uses AI with a local fallback when all providers are unavailable.
 */

import { createClient } from "@/lib/supabase/server";
import { callGemini } from "@/lib/ai/gemini";
import type { MatchResult } from "@/types";

interface InsightResponse {
  success: boolean;
  data: {
    summary: string;
    strengths: string[];
    improvements: string[];
    nextSteps: string[];
    matchSummary: string;
  } | null;
  error?: string;
}

/** Role expected skills for local fallback */
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

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json(
        { success: false, data: null, error: "Authentication required" } satisfies InsightResponse,
        { status: 401 }
      );
    }

    // Fetch user data
    const { data: profile } = await supabase
      .from("skill_profiles")
      .select("id, work_preferences")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return Response.json(
        { success: false, data: null, error: "Complete your profile first" } satisfies InsightResponse,
        { status: 404 }
      );
    }

    const { data: skillsData } = await supabase
      .from("skills")
      .select("name, proficiency_level")
      .eq("skill_profile_id", profile.id);

    const { data: matchData } = await supabase
      .from("match_results")
      .select("match_percentage, matched_skills, missing_skills")
      .eq("applicant_id", user.id);

    const skills = skillsData ?? [];
    const matchResults = (matchData ?? []) as MatchResult[];

    const prefs = profile.work_preferences as Record<string, unknown> | null;
    const careerGoal = (prefs?.careerGoal as string) || null;

    // If no skills or matches, return early
    if (skills.length === 0 && matchResults.length === 0) {
      return Response.json(
        { success: false, data: null, error: "Upload your resume to get personalized insights" } satisfies InsightResponse,
        { status: 404 }
      );
    }

    // Calculate stats for context
    const avgMatch = matchResults.length > 0
      ? Math.round(matchResults.reduce((sum, m) => sum + m.match_percentage, 0) / matchResults.length)
      : 0;

    const missingSkillsFreq: Record<string, number> = {};
    matchResults.forEach((m) => {
      (m.missing_skills ?? []).forEach((s) => {
        missingSkillsFreq[s] = (missingSkillsFreq[s] || 0) + 1;
      });
    });

    const topMissing = Object.entries(missingSkillsFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name]) => name);

    const highMatchJobs = matchResults.filter((m) => m.match_percentage >= 70).length;
    const hiddenGems = matchResults.filter(
      (m) => m.match_percentage >= 60 && (m.missing_skills?.length ?? 0) <= 3
    ).length;

    // Try AI-generated insights
    try {
      const insights = await generateAIInsights({
        skills: skills.map((s) => `${s.name} (${s.proficiency_level})`),
        careerGoal,
        avgMatch,
        totalJobs: matchResults.length,
        highMatchJobs,
        hiddenGems,
        topMissing,
      });

      return Response.json({ success: true, data: insights } satisfies InsightResponse);
    } catch {
      // Fall back to local generation
      const insights = generateLocalInsights({
        skills: skills.map((s) => ({ name: s.name, level: s.proficiency_level })),
        careerGoal,
        avgMatch,
        totalJobs: matchResults.length,
        highMatchJobs,
        hiddenGems,
        topMissing,
      });

      return Response.json({ success: true, data: insights } satisfies InsightResponse);
    }
  } catch (error) {
    console.error("[insights] Error:", error);
    return Response.json(
      { success: false, data: null, error: "Failed to generate insights" } satisfies InsightResponse,
      { status: 500 }
    );
  }
}

async function generateAIInsights(context: {
  skills: string[];
  careerGoal: string | null;
  avgMatch: number;
  totalJobs: number;
  highMatchJobs: number;
  hiddenGems: number;
  topMissing: string[];
}) {
  const systemPrompt = `You are a career coach AI. Generate personalized, encouraging, and actionable career insights based on a job seeker's profile data. Be specific, use their actual skills and stats. Keep it concise — max 2 sentences per field. Always respond with valid JSON.`;

  const userPrompt = `Generate career insights for this applicant:

PROFILE:
- Skills: ${context.skills.join(", ")}
- Career Goal: ${context.careerGoal || "Not set"}
- Average Job Match: ${context.avgMatch}%
- Total Jobs Matched Against: ${context.totalJobs}
- High-Match Jobs (70%+): ${context.highMatchJobs}
- Hidden Gems (close to qualifying): ${context.hiddenGems}
- Top Missing Skills: ${context.topMissing.join(", ") || "None"}

Return this JSON structure:
{
  "summary": "A 1-2 sentence overall assessment of where they stand",
  "strengths": ["2-3 specific strength observations based on their skills"],
  "improvements": ["2-3 specific areas to improve based on missing skills"],
  "nextSteps": ["2-3 actionable next steps they should take"],
  "matchSummary": "1 sentence about their job match performance"
}`;

  const content = await callGemini(systemPrompt, userPrompt, { temperature: 0.3, maxTokens: 1000 });
  const jsonStr = content.replace(/```json\n?|\n?```/g, "").trim();
  const parsed = JSON.parse(jsonStr);

  return {
    summary: String(parsed.summary || ""),
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String).slice(0, 3) : [],
    improvements: Array.isArray(parsed.improvements) ? parsed.improvements.map(String).slice(0, 3) : [],
    nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps.map(String).slice(0, 3) : [],
    matchSummary: String(parsed.matchSummary || ""),
  };
}

function generateLocalInsights(context: {
  skills: { name: string; level: string }[];
  careerGoal: string | null;
  avgMatch: number;
  totalJobs: number;
  highMatchJobs: number;
  hiddenGems: number;
  topMissing: string[];
}) {
  const { skills, careerGoal, avgMatch, totalJobs, highMatchJobs, hiddenGems, topMissing } = context;

  const advancedSkills = skills.filter((s) => s.level === "advanced" || s.level === "expert");
  const beginnerSkills = skills.filter((s) => s.level === "beginner");

  // Summary
  let summary = "";
  if (avgMatch >= 75) {
    summary = `You're in a strong position with a ${avgMatch}% average match across ${totalJobs} jobs. Your profile aligns well with current market demands.`;
  } else if (avgMatch >= 50) {
    summary = `You have a solid foundation with a ${avgMatch}% average match. With a few targeted skill additions, you could significantly improve your competitiveness.`;
  } else if (totalJobs > 0) {
    summary = `You're building toward your goals with a ${avgMatch}% average match. Focus on the most in-demand skills to accelerate your progress.`;
  } else {
    summary = `You have ${skills.length} skills on your profile. Start applying to jobs to see how you match up against market requirements.`;
  }

  // Strengths
  const strengths: string[] = [];
  if (advancedSkills.length > 0) {
    strengths.push(`Strong proficiency in ${advancedSkills.slice(0, 3).map((s) => s.name).join(", ")}`);
  }
  if (highMatchJobs > 0) {
    strengths.push(`${highMatchJobs} job${highMatchJobs > 1 ? "s" : ""} where you match 70% or higher`);
  }
  if (skills.length >= 8) {
    strengths.push(`Diverse skill set covering ${skills.length} areas`);
  }
  if (strengths.length === 0) {
    strengths.push(`${skills.length} skills identified from your resume`);
  }

  // Improvements
  const improvements: string[] = [];
  if (topMissing.length > 0) {
    improvements.push(`Learn ${topMissing.slice(0, 2).join(" and ")} — most requested by employers in your matches`);
  }
  if (beginnerSkills.length > 2) {
    improvements.push(`Deepen your expertise in ${beginnerSkills.slice(0, 2).map((s) => s.name).join(" and ")} beyond beginner level`);
  }
  if (careerGoal) {
    const expected = ROLE_EXPECTED_SKILLS[careerGoal];
    if (expected) {
      const userSkillNames = skills.map((s) => s.name.toLowerCase());
      const missing = expected.filter((e) => !userSkillNames.some((u) => u.includes(e.toLowerCase())));
      if (missing.length > 0) {
        improvements.push(`For ${careerGoal}: add ${missing.slice(0, 2).join(", ")} to your skill set`);
      }
    }
  }
  if (improvements.length === 0) {
    improvements.push("Keep building projects to demonstrate your skills practically");
  }

  // Next steps
  const nextSteps: string[] = [];
  if (hiddenGems > 0) {
    nextSteps.push(`Check your ${hiddenGems} hidden gem jobs — you're almost qualified for them`);
  }
  if (topMissing.length > 0) {
    nextSteps.push(`Take a course in ${topMissing[0]} to unlock the most job opportunities`);
  }
  nextSteps.push("Apply to your highest-match jobs to build momentum");
  if (careerGoal) {
    nextSteps.push(`Visit Learning Paths for courses tailored to your ${careerGoal} goal`);
  }

  // Match summary
  let matchSummary = "";
  if (totalJobs > 0) {
    matchSummary = `You're matched against ${totalJobs} jobs with ${highMatchJobs} strong matches (70%+)${hiddenGems > 0 ? ` and ${hiddenGems} hidden gems waiting to be unlocked` : ""}.`;
  } else {
    matchSummary = "Start browsing jobs to see your personalized match scores.";
  }

  return { summary, strengths: strengths.slice(0, 3), improvements: improvements.slice(0, 3), nextSteps: nextSteps.slice(0, 3), matchSummary };
}
