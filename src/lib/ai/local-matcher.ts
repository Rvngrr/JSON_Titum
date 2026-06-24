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

  // ─── Culinary & Hospitality ─────────────────────────────────────────
  "knife skills": ["knife handling", "knife techniques", "cutting techniques"],
  "menu planning": ["menu development", "menu design", "menu creation", "menu engineering"],
  "food safety": ["food hygiene", "food sanitation", "food handling", "safe food handling"],
  "haccp": ["haccp certification", "hazard analysis", "hazard analysis critical control points"],
  "servsafe": ["servsafe certification", "servsafe certified"],
  "pastry arts": ["pastry making", "baking", "patisserie", "bread baking"],
  "culinary arts": ["culinary skills", "cooking", "cookery", "culinary techniques", "food preparation"],
  "kitchen management": ["kitchen operations", "back of house", "boh management"],
  "food plating": ["food presentation", "plating techniques", "garnishing", "food styling"],
  "grilling": ["grill cooking", "bbq", "barbecue", "charbroiling"],
  "butchery": ["meat cutting", "meat preparation", "meat fabrication"],
  "sous vide": ["sous vide cooking", "vacuum cooking"],
  "catering": ["catering services", "event catering", "catering management"],
  "wine pairing": ["wine knowledge", "sommelier", "wine service", "beverage pairing"],
  "nutrition planning": ["dietary planning", "nutritional analysis", "meal planning"],
  "barista skills": ["coffee making", "espresso preparation", "latte art"],
  "mixology": ["bartending", "cocktail making", "beverage preparation"],
  "inventory management": ["stock management", "inventory control", "stock control"],
  "cost control": ["food cost control", "cost management", "cost reduction"],
  "hotel management": ["hotel operations", "hospitality management"],
  "banquet management": ["banquet operations", "event management", "banquet coordination"],

  // ─── Education & Teaching ───────────────────────────────────────────
  "curriculum development": ["curriculum design", "course development", "syllabus design"],
  "lesson planning": ["lesson design", "instructional planning"],
  "classroom management": ["class management", "student discipline", "behavior management"],
  "special education": ["sped", "special needs education", "inclusive education"],
  "e-learning": ["online teaching", "virtual instruction", "distance learning", "lms"],
  "tutoring": ["academic tutoring", "private tutoring"],

  // ─── Construction & Trades ──────────────────────────────────────────
  "blueprint reading": ["reading blueprints", "technical drawings", "construction drawings"],
  "welding": ["mig welding", "tig welding", "arc welding", "stick welding"],
  "plumbing": ["plumbing systems", "pipe fitting", "plumbing installation"],
  "electrical wiring": ["electrical installation", "electrical systems", "electrical work"],
  "carpentry": ["woodworking", "framing", "finish carpentry"],
  "hvac": ["heating ventilation air conditioning", "hvac systems", "climate control"],
  "osha compliance": ["osha safety", "workplace safety", "osha certification"],
  "heavy equipment operation": ["crane operation", "excavator operation", "forklift operation"],

  // ─── Agriculture ────────────────────────────────────────────────────
  "crop management": ["crop production", "crop cultivation", "agronomy"],
  "irrigation systems": ["irrigation management", "drip irrigation", "water management"],
  "pest management": ["pest control", "integrated pest management", "ipm"],
  "livestock management": ["animal husbandry", "livestock care", "herd management"],
  "organic farming": ["organic agriculture", "sustainable farming"],

  // ─── Automotive ─────────────────────────────────────────────────────
  "engine diagnostics": ["engine repair", "engine troubleshooting", "motor diagnostics"],
  "brake systems": ["brake repair", "brake maintenance"],
  "transmission repair": ["transmission service", "gearbox repair"],
  "ase certification": ["ase certified", "automotive service excellence"],
  "auto body repair": ["collision repair", "body work", "panel beating"],

  // ─── Aviation ───────────────────────────────────────────────────────
  "flight operations": ["flight management", "flight planning", "flight dispatch"],
  "aircraft maintenance": ["aircraft repair", "airframe maintenance", "a&p mechanic"],
  "aviation safety": ["flight safety", "safety management system"],
  "avionics": ["avionics systems", "aircraft electronics"],

  // ─── Fitness & Wellness ─────────────────────────────────────────────
  "personal training": ["personal trainer", "fitness coaching", "one-on-one training"],
  "group fitness": ["group exercise", "group classes", "fitness classes"],
  "yoga instruction": ["yoga teaching", "yoga certification", "ryt"],
  "sports nutrition": ["nutrition coaching", "dietary guidance"],
  "cpr/aed": ["cpr certification", "first aid", "aed certification", "bls certification"],
  "massage therapy": ["sports massage", "therapeutic massage", "deep tissue massage"],

  // ─── Sales & Marketing ──────────────────────────────────────────────
  "crm": ["customer relationship management", "salesforce", "hubspot"],
  "digital marketing": ["online marketing", "internet marketing"],
  "seo": ["search engine optimization", "organic search"],
  "social media marketing": ["smm", "social media management", "social media strategy"],
  "content marketing": ["content strategy", "content creation", "copywriting"],
  "email marketing": ["email campaigns", "newsletter marketing", "marketing automation"],
  "lead generation": ["lead gen", "prospecting", "pipeline management"],
  "google analytics": ["ga4", "web analytics"],
  "ppc advertising": ["pay per click", "google ads", "sem", "paid search"],
  "brand management": ["branding", "brand strategy", "brand development"],

  // ─── Human Resources ────────────────────────────────────────────────
  "talent acquisition": ["recruiting", "recruitment", "talent sourcing", "hiring"],
  "employee relations": ["labor relations", "workplace relations"],
  "performance management": ["performance review", "performance appraisal"],
  "hris": ["hr information systems", "workday", "bamboohr"],
  "onboarding": ["employee onboarding", "new hire orientation"],
  "training & development": ["l&d", "learning and development", "employee training"],

  // ─── Legal ──────────────────────────────────────────────────────────
  "legal research": ["case research", "legal analysis", "westlaw", "lexisnexis"],
  "contract drafting": ["contract writing", "legal drafting", "agreement preparation"],
  "litigation": ["trial litigation", "civil litigation", "criminal litigation"],
  "compliance management": ["regulatory compliance", "legal compliance"],
  "intellectual property": ["ip law", "patent law", "trademark", "copyright law"],

  // ─── Engineering ────────────────────────────────────────────────────
  "autocad": ["autocad drawing", "cad", "computer aided design"],
  "solidworks": ["solidworks cad", "solid works", "3d cad modeling"],
  "quality control": ["qc", "quality assurance", "qa", "quality management", "six sigma"],
  "lean manufacturing": ["lean principles", "kaizen", "continuous improvement", "lean six sigma"],
  "plc programming": ["programmable logic controller", "industrial automation", "scada"],
  "robotics": ["robot programming", "industrial robotics"],

  // ─── Accounting & Finance ───────────────────────────────────────────
  "financial reporting": ["financial statements", "gaap reporting", "ifrs reporting"],
  "tax preparation": ["tax filing", "tax planning", "tax compliance"],
  "auditing": ["internal audit", "external audit", "financial audit"],
  "bookkeeping": ["accounts payable", "accounts receivable", "general ledger"],
  "quickbooks": ["quickbooks online", "qb"],
  "sap": ["sap erp", "sap fico"],
  "budget management": ["budgeting", "budget planning", "financial planning"],

  // ─── Healthcare Clinical ────────────────────────────────────────────
  "patient care": ["patient management", "bedside care", "patient assessment"],
  "nursing": ["registered nurse", "rn", "nursing care", "clinical nursing"],
  "phlebotomy": ["blood draw", "venipuncture", "blood collection"],
  "medical coding": ["icd-10", "cpt coding", "medical billing"],
  "physical therapy": ["physiotherapy", "rehabilitation therapy", "manual therapy"],

  // ─── Manufacturing ──────────────────────────────────────────────────
  "cnc machining": ["cnc programming", "cnc operation", "cnc milling"],
  "iso 9001": ["iso certification", "quality management system", "qms"],
  "supply chain management": ["scm", "supply chain optimization"],
  "production planning": ["production scheduling", "manufacturing planning", "mrp"],
  "warehouse management": ["wms", "warehouse operations", "warehouse logistics"],

  // ─── Logistics ──────────────────────────────────────────────────────
  "freight management": ["freight forwarding", "shipping management", "cargo management"],
  "fleet management": ["vehicle fleet", "fleet operations", "transportation management"],
  "procurement": ["purchasing", "vendor management", "supplier management", "sourcing"],

  // ─── Arts & Creative ────────────────────────────────────────────────
  "graphic design": ["visual design", "graphics", "digital design"],
  "photography": ["photo editing", "portrait photography", "product photography"],
  "video production": ["videography", "video editing", "film production"],
  "animation": ["2d animation", "3d animation", "motion graphics"],
  "after effects": ["adobe after effects", "motion design"],
  "premiere pro": ["adobe premiere", "video editing software"],
  "fashion design": ["garment design", "apparel design", "textile design", "pattern making"],
  "interior design": ["space planning", "interior decoration"],

  // ─── Retail & Service ───────────────────────────────────────────────
  "customer service": ["client service", "customer support", "customer assistance", "customer care"],
  "pos operations": ["pos systems", "point of sale", "cash register", "pos terminal"],
  "cash handling": ["cash management", "cashiering", "money handling"],
  "visual merchandising": ["merchandising", "product display", "store layout"],
  "retail management": ["retail operations", "store management"],
  "stock management": ["stock control", "stock shelving", "fifo", "stock rotation"],
  "digital payments": ["mobile payments", "e-wallet", "gcash", "maya", "electronic payments"],
  "customer relations": ["client relations", "interpersonal communication", "customer engagement"],
  "food service": ["food handling", "food preparation", "food serving"],
  "loss prevention": ["shrinkage prevention", "asset protection"],
  "upselling": ["cross-selling", "suggestive selling"],
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
