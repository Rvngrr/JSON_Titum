/**
 * GET /api/hr-insights
 *
 * Generates AI-powered platform insights for the Job Curator.
 * Analyzes match quality, skill gaps, engagement patterns, and applicant pool health.
 */

import { createClient } from "@/lib/supabase/server";
import { callGemini } from "@/lib/ai/gemini";

interface HRInsightResponse {
  success: boolean;
  data: {
    summary: string;
    platformHealth: string[];
    skillGapActions: string[];
    engagementTips: string[];
    hiringRecommendations: string[];
  } | null;
  error?: string;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json(
        { success: false, data: null, error: "Authentication required" } satisfies HRInsightResponse,
        { status: 401 }
      );
    }

    // Verify user is HR
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "hr_user") {
      return Response.json(
        { success: false, data: null, error: "HR access required" } satisfies HRInsightResponse,
        { status: 403 }
      );
    }

    // Fetch platform data
    const [jobsRes, applicantsRes, applicationsRes, matchRes, jobSkillsRes, applicantSkillsRes] = await Promise.all([
      supabase.from("job_descriptions").select("id, status, title"),
      supabase.from("profiles").select("id").eq("role", "applicant"),
      supabase.from("applications").select("job_description_id"),
      supabase.from("match_results").select("match_percentage, missing_skills"),
      supabase.from("job_required_skills").select("skill_name"),
      supabase.from("skills").select("name"),
    ]);

    const jobs = jobsRes.data ?? [];
    const publishedJobs = jobs.filter((j) => j.status === "published").length;
    const totalApplicants = applicantsRes.data?.length ?? 0;
    const totalApplications = applicationsRes.data?.length ?? 0;
    const matchResults = matchRes.data ?? [];

    // Calculate stats
    const avgMatch = matchResults.length > 0
      ? Math.round(matchResults.reduce((sum, m) => sum + m.match_percentage, 0) / matchResults.length)
      : 0;

    const highMatches = matchResults.filter((m) => m.match_percentage >= 70).length;
    const lowMatches = matchResults.filter((m) => m.match_percentage < 30).length;

    // Application rate per job
    const appsByJob = new Map<string, number>();
    (applicationsRes.data ?? []).forEach((a) => {
      appsByJob.set(a.job_description_id, (appsByJob.get(a.job_description_id) || 0) + 1);
    });
    const jobsWithNoApps = jobs.filter((j) => j.status === "published" && !appsByJob.has(j.id)).length;

    // Skill demand vs supply
    const demandMap = new Map<string, number>();
    (jobSkillsRes.data ?? []).forEach((s) => {
      const key = s.skill_name.toLowerCase();
      demandMap.set(key, (demandMap.get(key) || 0) + 1);
    });

    const supplyMap = new Map<string, number>();
    (applicantSkillsRes.data ?? []).forEach((s) => {
      const key = s.name.toLowerCase();
      supplyMap.set(key, (supplyMap.get(key) || 0) + 1);
    });

    // Find biggest gaps
    const skillGaps: { skill: string; demand: number; supply: number }[] = [];
    for (const [skill, demand] of demandMap) {
      const supply = supplyMap.get(skill) || 0;
      if (demand > supply) {
        skillGaps.push({ skill, demand, supply });
      }
    }
    skillGaps.sort((a, b) => (b.demand - b.supply) - (a.demand - a.supply));
    const topGaps = skillGaps.slice(0, 5).map((g) => g.skill);

    // Oversupplied skills
    const oversupplied: string[] = [];
    for (const [skill, supply] of supplyMap) {
      const demand = demandMap.get(skill) || 0;
      if (supply > demand + 3) {
        oversupplied.push(skill);
      }
    }

    const context = {
      totalJobs: jobs.length,
      publishedJobs,
      totalApplicants,
      totalApplications,
      avgMatch,
      highMatches,
      lowMatches,
      totalMatchPairs: matchResults.length,
      jobsWithNoApps,
      topGaps,
      oversupplied: oversupplied.slice(0, 5),
      applicationRate: publishedJobs > 0 ? Math.round((totalApplications / publishedJobs) * 10) / 10 : 0,
    };

    // Try AI
    try {
      const insights = await generateAIHRInsights(context);
      return Response.json({ success: true, data: insights } satisfies HRInsightResponse);
    } catch {
      const insights = generateLocalHRInsights(context);
      return Response.json({ success: true, data: insights } satisfies HRInsightResponse);
    }
  } catch (error) {
    console.error("[hr-insights] Error:", error);
    return Response.json(
      { success: false, data: null, error: "Failed to generate insights" } satisfies HRInsightResponse,
      { status: 500 }
    );
  }
}

async function generateAIHRInsights(context: {
  totalJobs: number;
  publishedJobs: number;
  totalApplicants: number;
  totalApplications: number;
  avgMatch: number;
  highMatches: number;
  lowMatches: number;
  totalMatchPairs: number;
  jobsWithNoApps: number;
  topGaps: string[];
  oversupplied: string[];
  applicationRate: number;
}) {
  const systemPrompt = `You are a workforce analytics AI advisor for a job matching platform. Generate actionable insights for the platform administrator (Job Curator) based on platform data. Be specific, data-driven, and prescriptive. Always respond with valid JSON.`;

  const userPrompt = `Generate platform insights for this Job Curator:

PLATFORM DATA:
- Total Jobs: ${context.totalJobs} (${context.publishedJobs} published)
- Total Applicants: ${context.totalApplicants}
- Total Applications: ${context.totalApplications}
- Application Rate: ${context.applicationRate} apps/job
- Average Match Quality: ${context.avgMatch}%
- High-Quality Matches (70%+): ${context.highMatches} of ${context.totalMatchPairs} total
- Low Matches (<30%): ${context.lowMatches}
- Jobs With No Applications: ${context.jobsWithNoApps}
- Skills In High Demand (not enough applicants have them): ${context.topGaps.join(", ") || "None identified"}
- Oversupplied Skills (more applicants than jobs need): ${context.oversupplied.join(", ") || "None identified"}

Return this JSON:
{
  "summary": "2-3 sentence executive summary of platform health and key action needed",
  "platformHealth": ["2-3 observations about overall platform health based on the numbers"],
  "skillGapActions": ["2-3 specific actions to address the skill demand-supply mismatch"],
  "engagementTips": ["2-3 suggestions to improve application rates and reduce zero-app jobs"],
  "hiringRecommendations": ["2-3 recommendations about which types of jobs to source next"]
}`;

  const content = await callGemini(systemPrompt, userPrompt, { temperature: 0.3, maxTokens: 1000 });
  const jsonStr = content.replace(/```json\n?|\n?```/g, "").trim();
  const parsed = JSON.parse(jsonStr);

  return {
    summary: String(parsed.summary || ""),
    platformHealth: Array.isArray(parsed.platformHealth) ? parsed.platformHealth.map(String).slice(0, 3) : [],
    skillGapActions: Array.isArray(parsed.skillGapActions) ? parsed.skillGapActions.map(String).slice(0, 3) : [],
    engagementTips: Array.isArray(parsed.engagementTips) ? parsed.engagementTips.map(String).slice(0, 3) : [],
    hiringRecommendations: Array.isArray(parsed.hiringRecommendations) ? parsed.hiringRecommendations.map(String).slice(0, 3) : [],
  };
}

function generateLocalHRInsights(context: {
  totalJobs: number;
  publishedJobs: number;
  totalApplicants: number;
  totalApplications: number;
  avgMatch: number;
  highMatches: number;
  lowMatches: number;
  totalMatchPairs: number;
  jobsWithNoApps: number;
  topGaps: string[];
  oversupplied: string[];
  applicationRate: number;
}) {
  const { totalJobs, publishedJobs, totalApplicants, totalApplications, avgMatch, highMatches, totalMatchPairs, jobsWithNoApps, topGaps, oversupplied, applicationRate } = context;

  // Summary
  let summary = "";
  if (avgMatch >= 60) {
    summary = `Your platform shows strong alignment between job requirements and applicant skills with a ${avgMatch}% average match. Focus on converting these matches into applications.`;
  } else if (avgMatch >= 40) {
    summary = `Platform match quality is moderate at ${avgMatch}%. There's an opportunity to improve by sourcing jobs that better align with your applicant pool's skill set.`;
  } else {
    summary = `Match quality is low at ${avgMatch}%, suggesting a significant gap between what your jobs require and what applicants offer. Consider diversifying your job sources or helping applicants upskill.`;
  }

  // Platform Health
  const platformHealth: string[] = [];
  if (totalMatchPairs > 0) {
    const highMatchRate = Math.round((highMatches / totalMatchPairs) * 100);
    platformHealth.push(`${highMatchRate}% of all match pairs score 70%+ — ${highMatchRate >= 30 ? "healthy pipeline" : "room to improve alignment"}`);
  }
  platformHealth.push(`${totalApplicants} applicants across ${publishedJobs} published jobs (${applicationRate} applications per job on average)`);
  if (jobsWithNoApps > 0) {
    platformHealth.push(`${jobsWithNoApps} published job${jobsWithNoApps > 1 ? "s have" : " has"} received zero applications — consider reviewing their requirements`);
  }

  // Skill Gap Actions
  const skillGapActions: string[] = [];
  if (topGaps.length > 0) {
    skillGapActions.push(`High demand, low supply: ${topGaps.slice(0, 3).join(", ")} — consider promoting training resources for these skills`);
    skillGapActions.push(`Source jobs that require skills your applicants already have (${oversupplied.slice(0, 3).join(", ") || "check analytics"}) to improve match rates`);
  }
  skillGapActions.push("Review job postings with required skills that no applicants possess — consider making them preferred instead");

  // Engagement Tips
  const engagementTips: string[] = [];
  if (jobsWithNoApps > 0) {
    engagementTips.push(`${jobsWithNoApps} jobs have no applicants — review their skill requirements, they may be too niche`);
  }
  engagementTips.push("Jobs with clear, concise descriptions and 5-8 required skills get the most applications");
  if (applicationRate < 2) {
    engagementTips.push("Application rate is below 2 per job — consider reducing required skills or broadening job titles");
  } else {
    engagementTips.push(`${applicationRate} apps/job is ${applicationRate >= 5 ? "excellent" : "solid"} — maintain quality postings`);
  }

  // Hiring Recommendations
  const hiringRecommendations: string[] = [];
  if (oversupplied.length > 0) {
    hiringRecommendations.push(`Your applicant pool is strong in ${oversupplied.slice(0, 2).join(" and ")} — source more jobs requiring these skills`);
  }
  hiringRecommendations.push(`With ${totalApplicants} applicants, prioritize mid-level roles where match rates tend to be highest`);
  if (totalApplications > 0 && totalJobs > 0) {
    hiringRecommendations.push("Focus on publishing roles in the 61-80% match bracket — these drive the most applications");
  }

  return {
    summary,
    platformHealth: platformHealth.slice(0, 3),
    skillGapActions: skillGapActions.slice(0, 3),
    engagementTips: engagementTips.slice(0, 3),
    hiringRecommendations: hiringRecommendations.slice(0, 3),
  };
}
