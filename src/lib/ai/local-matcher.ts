/**
 * Local skill matching engine — no AI calls needed.
 * 
 * Uses fuzzy string matching and a synonym map to determine
 * if an applicant's skills match job requirements. This eliminates
 * the need for AI API calls for match calculation, saving quota.
 */

// Skill synonyms map: each key maps to its equivalent names
const SKILL_SYNONYMS: Record<string, string[]> = {
  "javascript": ["js", "ecmascript", "es6", "es2015", "es2020", "vanilla js"],
  "typescript": ["ts"],
  "react": ["react.js", "reactjs", "react js", "react framework"],
  "next.js": ["nextjs", "next", "next js"],
  "node.js": ["nodejs", "node", "node js"],
  "vue": ["vue.js", "vuejs", "vue js"],
  "angular": ["angularjs", "angular.js"],
  "python": ["python3", "python 3", "py"],
  "java": ["jdk", "java se"],
  "c++": ["cpp", "cplusplus", "c plus plus"],
  "c#": ["csharp", "c sharp"],
  "c": ["c language", "c programming"],
  "html/css": ["html", "css", "html5", "css3", "html & css", "html and css"],
  "html": ["html5", "hypertext markup language"],
  "css": ["css3", "cascading style sheets", "stylesheet"],
  "tailwind css": ["tailwind", "tailwindcss", "tailwind framework"],
  "sql": ["mysql", "postgresql", "postgres", "sqlite", "sql server", "mssql", "database"],
  "rest apis": ["rest", "restful", "rest api", "restful api", "api development", "api"],
  "docker": ["containerization", "containers", "docker compose"],
  "git": ["github", "gitlab", "version control", "git version control"],
  "machine learning": ["ml", "deep learning", "neural networks", "ai", "artificial intelligence"],
  "tensorflow": ["tf", "keras", "tensorflow framework"],
  "scikit learn": ["sklearn", "scikit-learn", "scikit"],
  "openai": ["openai api", "gpt", "chatgpt", "gpt-4", "gpt-4o"],
  "gemini": ["gemini api", "google gemini", "gemma", "gemma 3"],
  "figma": ["figma design", "figma prototyping"],
  "canva": ["canva design"],
  "ci/cd": ["cicd", "ci cd", "continuous integration", "continuous deployment", "github actions", "jenkins"],
  "linux": ["ubuntu", "debian", "centos", "unix"],
  "cloud services": ["aws", "gcp", "azure", "cloud computing", "cloud"],
  "flask": ["flask framework", "flask python"],
  "spring boot": ["spring", "spring framework"],
  "manual testing": ["manual qa", "manual quality assurance"],
  "functional testing": ["functional qa", "functional test"],
  "cross-browser testing": ["cross browser testing", "browser testing", "browser compatibility"],
  "debugging": ["debug", "troubleshooting", "bug fixing"],
  "responsive design": ["responsive web design", "mobile responsive", "responsive", "responsive ui"],
  "yolo": ["yolov5", "yolov8", "yolov11", "yolo model", "yolov11"],
  "opencv": ["open cv", "cv2", "computer vision"],
  "deep learning": ["dl", "neural networks", "deep neural networks", "dnn"],
  "prompt engineering": ["prompt design", "llm prompting"],
  "vite": ["vitejs", "vite bundler"],
  "prettier": ["prettier formatter", "code formatter"],
  "google colab": ["colab", "colaboratory"],
  "ollama": ["ollama ai", "ollama llm"],
  "analytical thinking": ["analytical skills", "analysis", "critical thinking"],
  "team collaboration": ["teamwork", "team work", "collaboration", "collaborative"],
  "problem-solving": ["problem solving", "troubleshooting"],
  "effective communication": ["communication", "communication skills"],
  "organizational skills": ["organization", "project management"],
  "excel": ["microsoft excel", "ms excel", "spreadsheets"],
  "microsoft word": ["ms word", "word"],
  "gsuite": ["google suite", "google workspace", "g suite"],
};

/**
 * Normalizes a skill name for comparison.
 */
function normalize(skill: string): string {
  return skill.toLowerCase().trim().replace(/[.\-_]/g, "").replace(/\s+/g, " ");
}

/**
 * Builds a reverse lookup: normalized synonym -> canonical name
 */
function buildSynonymLookup(): Map<string, string> {
  const lookup = new Map<string, string>();
  
  for (const [canonical, synonyms] of Object.entries(SKILL_SYNONYMS)) {
    const normalizedCanonical = normalize(canonical);
    lookup.set(normalizedCanonical, canonical);
    
    for (const synonym of synonyms) {
      lookup.set(normalize(synonym), canonical);
    }
  }
  
  return lookup;
}

const synonymLookup = buildSynonymLookup();

/**
 * Gets the canonical form of a skill name.
 */
function getCanonical(skill: string): string {
  const normalized = normalize(skill);
  return synonymLookup.get(normalized) || normalized;
}

/**
 * Checks if two skills match using synonym mapping and fuzzy logic.
 */
function skillsMatch(applicantSkill: string, jobSkill: string): boolean {
  const aCanonical = getCanonical(applicantSkill);
  const bCanonical = getCanonical(jobSkill);
  
  // Direct canonical match
  if (aCanonical === bCanonical) return true;
  
  // Normalized direct match
  const aNorm = normalize(applicantSkill);
  const bNorm = normalize(jobSkill);
  if (aNorm === bNorm) return true;
  
  // Check if one contains the other (for partial matches like "React" in "React.js")
  if (aNorm.includes(bNorm) || bNorm.includes(aNorm)) {
    // Only if the shorter one is at least 3 chars (avoid matching "c" with "css")
    const shorter = aNorm.length < bNorm.length ? aNorm : bNorm;
    if (shorter.length >= 3) return true;
  }
  
  return false;
}

/**
 * Performs local skill matching without any AI API calls.
 * Drop-in replacement for performSemanticMatching.
 */
export function performLocalMatching(
  applicantSkills: string[],
  jobSkills: Array<{ skill_name: string; importance: "required" | "preferred" }>
): Array<{
  jobSkill: string;
  applicantSkill: string | null;
  isMatch: boolean;
  importance: "required" | "preferred";
}> {
  if (jobSkills.length === 0) return [];
  
  if (applicantSkills.length === 0) {
    return jobSkills.map(js => ({
      jobSkill: js.skill_name,
      applicantSkill: null,
      isMatch: false,
      importance: js.importance,
    }));
  }

  return jobSkills.map(jobSkill => {
    // Find the first applicant skill that matches
    const matchingSkill = applicantSkills.find(as => skillsMatch(as, jobSkill.skill_name));
    
    return {
      jobSkill: jobSkill.skill_name,
      applicantSkill: matchingSkill || null,
      isMatch: !!matchingSkill,
      importance: jobSkill.importance,
    };
  });
}
