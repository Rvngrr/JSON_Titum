/**
 * Multi-Industry Skills Module
 *
 * Extends the skills taxonomy with entries for non-tech industries including
 * culinary/hospitality, education, construction, agriculture, automotive,
 * aviation, fitness, sales/marketing, HR, legal, arts, engineering,
 * accounting, healthcare clinical, manufacturing, and logistics.
 *
 * Reference: Kaggle Resume Classification Dataset categories and ESCO taxonomy.
 */

import type { SkillEntry } from './skills-types';

// ─── Culinary & Hospitality ──────────────────────────────────────────────────

export const CULINARY_HOSPITALITY: SkillEntry[] = [
  { canonical: 'Knife Skills', synonyms: ['knife handling', 'knife techniques', 'cutting techniques', 'knife work'], category: 'Culinary & Hospitality', industries: ['culinary-hospitality'] },
  { canonical: 'Menu Planning', synonyms: ['menu development', 'menu design', 'menu creation', 'menu engineering'], category: 'Culinary & Hospitality', industries: ['culinary-hospitality'] },
  { canonical: 'Food Safety', synonyms: ['food hygiene', 'food sanitation', 'food handling', 'safe food handling'], category: 'Culinary & Hospitality', industries: ['culinary-hospitality'] },
  { canonical: 'HACCP', synonyms: ['haccp certification', 'hazard analysis', 'haccp plan', 'hazard analysis critical control points'], category: 'Culinary & Hospitality', industries: ['culinary-hospitality'] },
  { canonical: 'ServSafe', synonyms: ['servsafe certification', 'servsafe certified', 'servsafe food handler'], category: 'Culinary & Hospitality', industries: ['culinary-hospitality'] },
  { canonical: 'Pastry Arts', synonyms: ['pastry making', 'baking', 'pastry chef', 'patisserie', 'bread baking'], category: 'Culinary & Hospitality', industries: ['culinary-hospitality'] },
  { canonical: 'Garde Manger', synonyms: ['cold kitchen', 'cold food preparation', 'garde manger chef'], category: 'Culinary & Hospitality', industries: ['culinary-hospitality'] },
  { canonical: 'Saucier', synonyms: ['sauce making', 'sauce preparation', 'sauté chef'], category: 'Culinary & Hospitality', industries: ['culinary-hospitality'] },
  { canonical: 'Inventory Management', synonyms: ['stock management', 'inventory control', 'stock control', 'inventory tracking'], category: 'Culinary & Hospitality', industries: ['culinary-hospitality', 'manufacturing', 'logistics'] },
  { canonical: 'Cost Control', synonyms: ['food cost control', 'cost management', 'budget control', 'cost reduction'], category: 'Culinary & Hospitality', industries: ['culinary-hospitality', 'accounting', 'manufacturing'] },
  { canonical: 'Catering', synonyms: ['catering services', 'event catering', 'catering management'], category: 'Culinary & Hospitality', industries: ['culinary-hospitality'] },
  { canonical: 'Wine Pairing', synonyms: ['wine knowledge', 'sommelier', 'wine service', 'beverage pairing'], category: 'Culinary & Hospitality', industries: ['culinary-hospitality'] },
  { canonical: 'Kitchen Management', synonyms: ['kitchen operations', 'back of house', 'BOH management', 'kitchen supervision'], category: 'Culinary & Hospitality', industries: ['culinary-hospitality'] },
  { canonical: 'Food Plating', synonyms: ['food presentation', 'plating techniques', 'garnishing', 'food styling'], category: 'Culinary & Hospitality', industries: ['culinary-hospitality'] },
  { canonical: 'Grilling', synonyms: ['grill cooking', 'BBQ', 'barbecue', 'charbroiling'], category: 'Culinary & Hospitality', industries: ['culinary-hospitality'] },
  { canonical: 'Butchery', synonyms: ['meat cutting', 'meat preparation', 'butcher skills', 'meat fabrication'], category: 'Culinary & Hospitality', industries: ['culinary-hospitality'] },
  { canonical: 'Sous Vide', synonyms: ['sous vide cooking', 'vacuum cooking', 'low temperature cooking'], category: 'Culinary & Hospitality', industries: ['culinary-hospitality'] },
  { canonical: 'Nutrition Planning', synonyms: ['dietary planning', 'nutritional analysis', 'meal planning', 'diet management'], category: 'Culinary & Hospitality', industries: ['culinary-hospitality', 'fitness-wellness', 'healthcare'] },
  { canonical: 'Point of Sale Systems', synonyms: ['POS', 'POS systems', 'point of sale', 'cash register systems'], category: 'Culinary & Hospitality', industries: ['culinary-hospitality', 'sales-marketing'] },
  { canonical: 'Guest Relations', synonyms: ['guest services', 'customer relations', 'hospitality service', 'front of house'], category: 'Culinary & Hospitality', industries: ['culinary-hospitality'] },
  { canonical: 'Banquet Management', synonyms: ['banquet operations', 'event management', 'banquet coordination'], category: 'Culinary & Hospitality', industries: ['culinary-hospitality'] },
  { canonical: 'Food Allergen Management', synonyms: ['allergen awareness', 'allergy management', 'dietary restrictions', 'allergen control'], category: 'Culinary & Hospitality', industries: ['culinary-hospitality'] },
  { canonical: 'Culinary Arts', synonyms: ['culinary skills', 'cooking', 'cookery', 'culinary techniques', 'food preparation'], category: 'Culinary & Hospitality', industries: ['culinary-hospitality'] },
  { canonical: 'Hotel Management', synonyms: ['hotel operations', 'hospitality management', 'hotel administration', 'front desk management'], category: 'Culinary & Hospitality', industries: ['culinary-hospitality'] },
  { canonical: 'Housekeeping', synonyms: ['housekeeping management', 'room maintenance', 'hotel housekeeping'], category: 'Culinary & Hospitality', industries: ['culinary-hospitality'] },
  { canonical: 'Barista Skills', synonyms: ['coffee making', 'espresso preparation', 'latte art', 'coffee brewing'], category: 'Culinary & Hospitality', industries: ['culinary-hospitality'] },
  { canonical: 'Mixology', synonyms: ['bartending', 'cocktail making', 'beverage preparation', 'bar management'], category: 'Culinary & Hospitality', industries: ['culinary-hospitality'] },
];

// ─── Education & Teaching ────────────────────────────────────────────────────

export const EDUCATION_TEACHING: SkillEntry[] = [
  { canonical: 'Curriculum Development', synonyms: ['curriculum design', 'course development', 'syllabus design', 'curriculum planning'], category: 'Education & Teaching', industries: ['education'] },
  { canonical: 'Lesson Planning', synonyms: ['lesson design', 'instructional planning', 'lesson preparation'], category: 'Education & Teaching', industries: ['education'] },
  { canonical: 'Classroom Management', synonyms: ['class management', 'student discipline', 'behavior management'], category: 'Education & Teaching', industries: ['education'] },
  { canonical: 'Assessment Design', synonyms: ['test design', 'examination development', 'assessment creation', 'evaluation design'], category: 'Education & Teaching', industries: ['education'] },
  { canonical: 'Differentiated Instruction', synonyms: ['differentiated learning', 'individualized instruction', 'adaptive teaching'], category: 'Education & Teaching', industries: ['education'] },
  { canonical: 'Special Education', synonyms: ['SPED', 'special needs education', 'inclusive education', 'IEP development'], category: 'Education & Teaching', industries: ['education'] },
  { canonical: 'E-Learning', synonyms: ['online teaching', 'virtual instruction', 'distance learning', 'LMS administration'], category: 'Education & Teaching', industries: ['education'] },
  { canonical: 'Student Counseling', synonyms: ['academic counseling', 'student advising', 'guidance counseling'], category: 'Education & Teaching', industries: ['education'] },
  { canonical: 'Educational Technology', synonyms: ['EdTech', 'instructional technology', 'learning technology'], category: 'Education & Teaching', industries: ['education'] },
  { canonical: 'Tutoring', synonyms: ['academic tutoring', 'private tutoring', 'peer tutoring'], category: 'Education & Teaching', industries: ['education'] },
  { canonical: 'Early Childhood Education', synonyms: ['ECE', 'preschool education', 'early learning', 'kindergarten teaching'], category: 'Education & Teaching', industries: ['education'] },
  { canonical: 'STEM Education', synonyms: ['science education', 'math education', 'STEM teaching'], category: 'Education & Teaching', industries: ['education'] },
  { canonical: 'Academic Research', synonyms: ['scholarly research', 'research methodology', 'academic publishing'], category: 'Education & Teaching', industries: ['education'] },
  { canonical: 'Parent Communication', synonyms: ['parent engagement', 'parent-teacher communication', 'family engagement'], category: 'Education & Teaching', industries: ['education'] },
  { canonical: 'Montessori Method', synonyms: ['montessori teaching', 'montessori education'], category: 'Education & Teaching', industries: ['education'] },
];

// ─── Construction & Trades ───────────────────────────────────────────────────

export const CONSTRUCTION_TRADES: SkillEntry[] = [
  { canonical: 'Blueprint Reading', synonyms: ['reading blueprints', 'technical drawings', 'construction drawings', 'architectural plans'], category: 'Construction & Trades', industries: ['construction', 'engineering'] },
  { canonical: 'Welding', synonyms: ['MIG welding', 'TIG welding', 'arc welding', 'stick welding', 'welding fabrication'], category: 'Construction & Trades', industries: ['construction', 'manufacturing'] },
  { canonical: 'Plumbing', synonyms: ['plumbing systems', 'pipe fitting', 'plumbing installation', 'pipefitting'], category: 'Construction & Trades', industries: ['construction'] },
  { canonical: 'Electrical Wiring', synonyms: ['electrical installation', 'wiring', 'electrical systems', 'electrical work'], category: 'Construction & Trades', industries: ['construction'] },
  { canonical: 'Carpentry', synonyms: ['woodworking', 'framing', 'finish carpentry', 'rough carpentry'], category: 'Construction & Trades', industries: ['construction'] },
  { canonical: 'Concrete Work', synonyms: ['concrete finishing', 'concrete pouring', 'masonry', 'cement work'], category: 'Construction & Trades', industries: ['construction'] },
  { canonical: 'HVAC', synonyms: ['heating ventilation air conditioning', 'HVAC systems', 'HVAC installation', 'climate control'], category: 'Construction & Trades', industries: ['construction'] },
  { canonical: 'Roofing', synonyms: ['roof installation', 'roofing systems', 'roof repair'], category: 'Construction & Trades', industries: ['construction'] },
  { canonical: 'Heavy Equipment Operation', synonyms: ['crane operation', 'excavator operation', 'bulldozer operation', 'forklift operation'], category: 'Construction & Trades', industries: ['construction', 'manufacturing'] },
  { canonical: 'OSHA Compliance', synonyms: ['OSHA safety', 'workplace safety', 'safety compliance', 'OSHA certification'], category: 'Construction & Trades', industries: ['construction', 'manufacturing'] },
  { canonical: 'Project Estimation', synonyms: ['cost estimation', 'construction estimating', 'bid preparation', 'quantity surveying'], category: 'Construction & Trades', industries: ['construction'] },
  { canonical: 'Site Management', synonyms: ['construction site management', 'site supervision', 'field supervision'], category: 'Construction & Trades', industries: ['construction'] },
  { canonical: 'Surveying', synonyms: ['land surveying', 'GPS surveying', 'topographic surveying'], category: 'Construction & Trades', industries: ['construction', 'engineering'] },
  { canonical: 'Drywall', synonyms: ['drywall installation', 'drywall finishing', 'plastering'], category: 'Construction & Trades', industries: ['construction'] },
  { canonical: 'Painting', synonyms: ['commercial painting', 'residential painting', 'spray painting', 'surface preparation'], category: 'Construction & Trades', industries: ['construction'] },
];

// ─── Agriculture ─────────────────────────────────────────────────────────────

export const AGRICULTURE: SkillEntry[] = [
  { canonical: 'Crop Management', synonyms: ['crop production', 'crop cultivation', 'agronomy', 'crop planning'], category: 'Agriculture', industries: ['agriculture'] },
  { canonical: 'Irrigation Systems', synonyms: ['irrigation management', 'drip irrigation', 'sprinkler systems', 'water management'], category: 'Agriculture', industries: ['agriculture'] },
  { canonical: 'Pest Management', synonyms: ['pest control', 'IPM', 'integrated pest management', 'pesticide application'], category: 'Agriculture', industries: ['agriculture'] },
  { canonical: 'Soil Science', synonyms: ['soil analysis', 'soil management', 'soil testing', 'soil health'], category: 'Agriculture', industries: ['agriculture'] },
  { canonical: 'Livestock Management', synonyms: ['animal husbandry', 'livestock care', 'animal management', 'herd management'], category: 'Agriculture', industries: ['agriculture'] },
  { canonical: 'Organic Farming', synonyms: ['organic agriculture', 'sustainable farming', 'organic production'], category: 'Agriculture', industries: ['agriculture'] },
  { canonical: 'Agricultural Machinery', synonyms: ['farm equipment', 'tractor operation', 'harvester operation', 'farm machinery'], category: 'Agriculture', industries: ['agriculture'] },
  { canonical: 'Greenhouse Management', synonyms: ['greenhouse operations', 'controlled environment agriculture', 'nursery management'], category: 'Agriculture', industries: ['agriculture'] },
  { canonical: 'Aquaculture', synonyms: ['fish farming', 'aquaponics', 'fish cultivation'], category: 'Agriculture', industries: ['agriculture'] },
  { canonical: 'Food Processing', synonyms: ['food manufacturing', 'food production', 'post-harvest processing'], category: 'Agriculture', industries: ['agriculture', 'manufacturing'] },
  { canonical: 'Precision Agriculture', synonyms: ['precision farming', 'smart farming', 'agricultural technology'], category: 'Agriculture', industries: ['agriculture'] },
  { canonical: 'Seed Technology', synonyms: ['seed production', 'seed treatment', 'plant breeding'], category: 'Agriculture', industries: ['agriculture'] },
];

// ─── Automotive ──────────────────────────────────────────────────────────────

export const AUTOMOTIVE: SkillEntry[] = [
  { canonical: 'Engine Diagnostics', synonyms: ['engine repair', 'engine troubleshooting', 'engine maintenance', 'motor diagnostics'], category: 'Automotive', industries: ['automotive'] },
  { canonical: 'Brake Systems', synonyms: ['brake repair', 'brake maintenance', 'brake inspection', 'ABS systems'], category: 'Automotive', industries: ['automotive'] },
  { canonical: 'Transmission Repair', synonyms: ['transmission service', 'gearbox repair', 'automatic transmission', 'manual transmission'], category: 'Automotive', industries: ['automotive'] },
  { canonical: 'Automotive Electrical', synonyms: ['auto electrical', 'vehicle electrical systems', 'wiring harness', 'electrical diagnostics'], category: 'Automotive', industries: ['automotive'] },
  { canonical: 'ASE Certification', synonyms: ['ASE certified', 'automotive service excellence', 'ASE master technician'], category: 'Automotive', industries: ['automotive'] },
  { canonical: 'OBD Diagnostics', synonyms: ['OBD-II', 'scan tool diagnostics', 'computer diagnostics', 'vehicle diagnostics'], category: 'Automotive', industries: ['automotive'] },
  { canonical: 'Suspension Systems', synonyms: ['suspension repair', 'steering systems', 'alignment', 'wheel alignment'], category: 'Automotive', industries: ['automotive'] },
  { canonical: 'Auto Body Repair', synonyms: ['collision repair', 'body work', 'panel beating', 'dent repair'], category: 'Automotive', industries: ['automotive'] },
  { canonical: 'Hybrid/EV Technology', synonyms: ['electric vehicle', 'EV systems', 'hybrid systems', 'EV maintenance'], category: 'Automotive', industries: ['automotive'] },
  { canonical: 'AC Systems', synonyms: ['automotive AC', 'air conditioning repair', 'climate control repair', 'refrigerant handling'], category: 'Automotive', industries: ['automotive'] },
  { canonical: 'Tire Service', synonyms: ['tire mounting', 'tire balancing', 'tire rotation', 'tire repair'], category: 'Automotive', industries: ['automotive'] },
  { canonical: 'Emissions Testing', synonyms: ['emissions inspection', 'smog testing', 'exhaust systems'], category: 'Automotive', industries: ['automotive'] },
];

// ─── Aviation ────────────────────────────────────────────────────────────────

export const AVIATION: SkillEntry[] = [
  { canonical: 'Flight Operations', synonyms: ['flight management', 'flight planning', 'flight dispatch'], category: 'Aviation', industries: ['aviation'] },
  { canonical: 'Aircraft Maintenance', synonyms: ['aircraft repair', 'airframe maintenance', 'A&P mechanic', 'aviation maintenance'], category: 'Aviation', industries: ['aviation'] },
  { canonical: 'Pilot License', synonyms: ['PPL', 'CPL', 'ATPL', 'commercial pilot license', 'private pilot license'], category: 'Aviation', industries: ['aviation'] },
  { canonical: 'Air Traffic Control', synonyms: ['ATC', 'air traffic management', 'flight control'], category: 'Aviation', industries: ['aviation'] },
  { canonical: 'Aviation Safety', synonyms: ['flight safety', 'aviation safety management', 'SMS', 'safety management system'], category: 'Aviation', industries: ['aviation'] },
  { canonical: 'Avionics', synonyms: ['avionics systems', 'aircraft electronics', 'flight instruments'], category: 'Aviation', industries: ['aviation'] },
  { canonical: 'Ground Handling', synonyms: ['ramp operations', 'ground operations', 'aircraft ground handling'], category: 'Aviation', industries: ['aviation'] },
  { canonical: 'Cabin Crew', synonyms: ['flight attendant', 'in-flight service', 'cabin service', 'passenger safety'], category: 'Aviation', industries: ['aviation'] },
  { canonical: 'Airport Operations', synonyms: ['airport management', 'terminal operations', 'aerodrome operations'], category: 'Aviation', industries: ['aviation'] },
  { canonical: 'FAA Regulations', synonyms: ['aviation regulations', 'FAR compliance', 'ICAO standards', 'aviation law'], category: 'Aviation', industries: ['aviation'] },
];

// ─── Fitness & Wellness ──────────────────────────────────────────────────────

export const FITNESS_WELLNESS: SkillEntry[] = [
  { canonical: 'Personal Training', synonyms: ['personal trainer', 'fitness coaching', 'PT', 'one-on-one training'], category: 'Fitness & Wellness', industries: ['fitness-wellness'] },
  { canonical: 'Group Fitness', synonyms: ['group exercise', 'group classes', 'fitness classes', 'aerobics instruction'], category: 'Fitness & Wellness', industries: ['fitness-wellness'] },
  { canonical: 'Strength Training', synonyms: ['weight training', 'resistance training', 'powerlifting', 'weightlifting'], category: 'Fitness & Wellness', industries: ['fitness-wellness'] },
  { canonical: 'Yoga Instruction', synonyms: ['yoga teaching', 'yoga certification', 'RYT', 'yoga therapy'], category: 'Fitness & Wellness', industries: ['fitness-wellness'] },
  { canonical: 'Sports Nutrition', synonyms: ['nutrition coaching', 'dietary guidance', 'sports dietetics'], category: 'Fitness & Wellness', industries: ['fitness-wellness'] },
  { canonical: 'CPR/AED', synonyms: ['CPR certification', 'first aid', 'AED certification', 'BLS certification'], category: 'Fitness & Wellness', industries: ['fitness-wellness', 'healthcare'] },
  { canonical: 'Exercise Physiology', synonyms: ['kinesiology', 'biomechanics', 'movement science'], category: 'Fitness & Wellness', industries: ['fitness-wellness'] },
  { canonical: 'Rehabilitation Exercise', synonyms: ['corrective exercise', 'injury rehabilitation', 'physical rehabilitation'], category: 'Fitness & Wellness', industries: ['fitness-wellness', 'healthcare'] },
  { canonical: 'Pilates', synonyms: ['pilates instruction', 'mat pilates', 'reformer pilates'], category: 'Fitness & Wellness', industries: ['fitness-wellness'] },
  { canonical: 'CrossFit', synonyms: ['crossfit coaching', 'functional fitness', 'HIIT training'], category: 'Fitness & Wellness', industries: ['fitness-wellness'] },
  { canonical: 'Massage Therapy', synonyms: ['sports massage', 'therapeutic massage', 'deep tissue massage', 'LMT'], category: 'Fitness & Wellness', industries: ['fitness-wellness'] },
  { canonical: 'Client Assessment', synonyms: ['fitness assessment', 'body composition', 'health screening', 'physical assessment'], category: 'Fitness & Wellness', industries: ['fitness-wellness'] },
];

// ─── Sales & Marketing ───────────────────────────────────────────────────────

export const SALES_MARKETING: SkillEntry[] = [
  { canonical: 'Sales Strategy', synonyms: ['sales planning', 'sales development', 'sales management', 'revenue generation'], category: 'Sales & Marketing', industries: ['sales-marketing'] },
  { canonical: 'CRM', synonyms: ['customer relationship management', 'Salesforce', 'HubSpot', 'CRM software'], category: 'Sales & Marketing', industries: ['sales-marketing'] },
  { canonical: 'Digital Marketing', synonyms: ['online marketing', 'internet marketing', 'digital advertising'], category: 'Sales & Marketing', industries: ['sales-marketing', 'public-relations'] },
  { canonical: 'SEO', synonyms: ['search engine optimization', 'organic search', 'SEO strategy', 'on-page SEO'], category: 'Sales & Marketing', industries: ['sales-marketing'] },
  { canonical: 'Social Media Marketing', synonyms: ['SMM', 'social media management', 'social media strategy', 'social media advertising'], category: 'Sales & Marketing', industries: ['sales-marketing', 'public-relations'] },
  { canonical: 'Content Marketing', synonyms: ['content strategy', 'content creation', 'content management', 'copywriting'], category: 'Sales & Marketing', industries: ['sales-marketing', 'public-relations'] },
  { canonical: 'Email Marketing', synonyms: ['email campaigns', 'newsletter marketing', 'marketing automation', 'drip campaigns'], category: 'Sales & Marketing', industries: ['sales-marketing'] },
  { canonical: 'Lead Generation', synonyms: ['lead gen', 'prospecting', 'business development', 'pipeline management'], category: 'Sales & Marketing', industries: ['sales-marketing'] },
  { canonical: 'Market Research', synonyms: ['market analysis', 'competitive analysis', 'consumer research', 'market intelligence'], category: 'Sales & Marketing', industries: ['sales-marketing'] },
  { canonical: 'Brand Management', synonyms: ['branding', 'brand strategy', 'brand development', 'brand identity'], category: 'Sales & Marketing', industries: ['sales-marketing', 'public-relations'] },
  { canonical: 'Google Analytics', synonyms: ['GA4', 'web analytics', 'google analytics 4', 'analytics reporting'], category: 'Sales & Marketing', industries: ['sales-marketing'] },
  { canonical: 'PPC Advertising', synonyms: ['pay per click', 'Google Ads', 'SEM', 'paid search', 'paid advertising'], category: 'Sales & Marketing', industries: ['sales-marketing'] },
  { canonical: 'Account Management', synonyms: ['client management', 'key account management', 'client retention'], category: 'Sales & Marketing', industries: ['sales-marketing'] },
  { canonical: 'Negotiation', synonyms: ['contract negotiation', 'deal closing', 'sales negotiation', 'business negotiation'], category: 'Sales & Marketing', industries: ['sales-marketing', 'legal', 'human-resources'] },
  { canonical: 'Product Marketing', synonyms: ['go-to-market', 'GTM strategy', 'product launch', 'product positioning'], category: 'Sales & Marketing', industries: ['sales-marketing'] },
];

// ─── Human Resources ─────────────────────────────────────────────────────────

export const HUMAN_RESOURCES: SkillEntry[] = [
  { canonical: 'Talent Acquisition', synonyms: ['recruiting', 'recruitment', 'talent sourcing', 'headhunting', 'hiring'], category: 'Human Resources', industries: ['human-resources'] },
  { canonical: 'Employee Relations', synonyms: ['labor relations', 'workplace relations', 'staff relations'], category: 'Human Resources', industries: ['human-resources'] },
  { canonical: 'Performance Management', synonyms: ['performance review', 'performance appraisal', 'employee evaluation', 'KPI management'], category: 'Human Resources', industries: ['human-resources'] },
  { canonical: 'Compensation & Benefits', synonyms: ['comp and benefits', 'payroll management', 'benefits administration', 'salary benchmarking'], category: 'Human Resources', industries: ['human-resources'] },
  { canonical: 'HRIS', synonyms: ['HR information systems', 'Workday', 'BambooHR', 'SAP HR', 'PeopleSoft'], category: 'Human Resources', industries: ['human-resources'] },
  { canonical: 'Onboarding', synonyms: ['employee onboarding', 'new hire orientation', 'induction program'], category: 'Human Resources', industries: ['human-resources'] },
  { canonical: 'Training & Development', synonyms: ['L&D', 'learning and development', 'employee training', 'professional development'], category: 'Human Resources', industries: ['human-resources', 'education'] },
  { canonical: 'HR Compliance', synonyms: ['labor law compliance', 'employment law', 'HR regulations', 'workplace compliance'], category: 'Human Resources', industries: ['human-resources'] },
  { canonical: 'Diversity & Inclusion', synonyms: ['D&I', 'DEI', 'diversity equity inclusion', 'inclusive workplace'], category: 'Human Resources', industries: ['human-resources'] },
  { canonical: 'Workforce Planning', synonyms: ['headcount planning', 'succession planning', 'talent pipeline'], category: 'Human Resources', industries: ['human-resources'] },
  { canonical: 'Conflict Resolution', synonyms: ['mediation', 'dispute resolution', 'workplace mediation'], category: 'Human Resources', industries: ['human-resources', 'legal'] },
  { canonical: 'HR Analytics', synonyms: ['people analytics', 'workforce analytics', 'HR metrics', 'HR data analysis'], category: 'Human Resources', industries: ['human-resources'] },
];

// ─── Legal ───────────────────────────────────────────────────────────────────

export const LEGAL: SkillEntry[] = [
  { canonical: 'Legal Research', synonyms: ['case research', 'legal analysis', 'statutory research', 'Westlaw', 'LexisNexis'], category: 'Legal', industries: ['legal'] },
  { canonical: 'Contract Drafting', synonyms: ['contract writing', 'legal drafting', 'agreement preparation', 'contract preparation'], category: 'Legal', industries: ['legal'] },
  { canonical: 'Litigation', synonyms: ['trial litigation', 'civil litigation', 'criminal litigation', 'dispute resolution'], category: 'Legal', industries: ['legal'] },
  { canonical: 'Compliance Management', synonyms: ['regulatory compliance', 'legal compliance', 'corporate compliance'], category: 'Legal', industries: ['legal', 'finance'] },
  { canonical: 'Intellectual Property', synonyms: ['IP law', 'patent law', 'trademark', 'copyright law', 'IP management'], category: 'Legal', industries: ['legal'] },
  { canonical: 'Corporate Law', synonyms: ['business law', 'commercial law', 'corporate governance'], category: 'Legal', industries: ['legal'] },
  { canonical: 'Legal Writing', synonyms: ['brief writing', 'legal memoranda', 'legal documentation'], category: 'Legal', industries: ['legal'] },
  { canonical: 'Due Diligence', synonyms: ['legal due diligence', 'compliance review', 'risk assessment'], category: 'Legal', industries: ['legal', 'finance'] },
  { canonical: 'Client Counseling', synonyms: ['legal advising', 'client advisory', 'legal consultation'], category: 'Legal', industries: ['legal'] },
  { canonical: 'Paralegal Skills', synonyms: ['legal assistant', 'paralegal', 'legal support', 'case management'], category: 'Legal', industries: ['legal'] },
  { canonical: 'Immigration Law', synonyms: ['visa processing', 'immigration compliance', 'work permits'], category: 'Legal', industries: ['legal'] },
  { canonical: 'Real Estate Law', synonyms: ['property law', 'real estate transactions', 'conveyancing'], category: 'Legal', industries: ['legal'] },
];

// ─── Arts & Creative ─────────────────────────────────────────────────────────

export const ARTS_CREATIVE: SkillEntry[] = [
  { canonical: 'Graphic Design', synonyms: ['visual design', 'graphics', 'digital design', 'print design'], category: 'Arts & Creative', industries: ['arts-creative', 'sales-marketing'] },
  { canonical: 'Photography', synonyms: ['photo editing', 'portrait photography', 'product photography', 'photojournalism'], category: 'Arts & Creative', industries: ['arts-creative'] },
  { canonical: 'Video Production', synonyms: ['videography', 'video editing', 'film production', 'video shooting'], category: 'Arts & Creative', industries: ['arts-creative', 'sales-marketing'] },
  { canonical: 'Animation', synonyms: ['2D animation', '3D animation', 'motion graphics', 'character animation'], category: 'Arts & Creative', industries: ['arts-creative', 'game-development'] },
  { canonical: 'Illustration', synonyms: ['digital illustration', 'hand illustration', 'concept art', 'drawing'], category: 'Arts & Creative', industries: ['arts-creative'] },
  { canonical: 'Audio Production', synonyms: ['sound design', 'audio editing', 'music production', 'sound engineering', 'podcast production'], category: 'Arts & Creative', industries: ['arts-creative'] },
  { canonical: 'Creative Writing', synonyms: ['fiction writing', 'storytelling', 'scriptwriting', 'screenwriting'], category: 'Arts & Creative', industries: ['arts-creative'] },
  { canonical: 'Typography', synonyms: ['font design', 'typographic design', 'lettering'], category: 'Arts & Creative', industries: ['arts-creative'] },
  { canonical: 'InDesign', synonyms: ['adobe indesign', 'page layout', 'desktop publishing'], category: 'Arts & Creative', industries: ['arts-creative'] },
  { canonical: 'After Effects', synonyms: ['adobe after effects', 'AE', 'motion design'], category: 'Arts & Creative', industries: ['arts-creative'] },
  { canonical: 'Premiere Pro', synonyms: ['adobe premiere', 'video editing software', 'premiere'], category: 'Arts & Creative', industries: ['arts-creative'] },
  { canonical: 'Final Cut Pro', synonyms: ['final cut', 'FCP', 'apple video editing'], category: 'Arts & Creative', industries: ['arts-creative'] },
  { canonical: 'Interior Design', synonyms: ['space planning', 'interior decoration', 'interior styling'], category: 'Arts & Creative', industries: ['arts-creative', 'construction'] },
  { canonical: 'Fashion Design', synonyms: ['garment design', 'apparel design', 'textile design', 'pattern making'], category: 'Arts & Creative', industries: ['arts-creative'] },
  { canonical: 'Fine Arts', synonyms: ['painting', 'sculpture', 'mixed media', 'art exhibition'], category: 'Arts & Creative', industries: ['arts-creative'] },
];

// ─── Engineering (Non-Software) ──────────────────────────────────────────────

export const ENGINEERING: SkillEntry[] = [
  { canonical: 'AutoCAD', synonyms: ['autocad drawing', 'CAD', 'computer aided design', 'auto cad'], category: 'Engineering', industries: ['engineering', 'construction'] },
  { canonical: 'SolidWorks', synonyms: ['solidworks cad', 'solid works', '3D CAD modeling'], category: 'Engineering', industries: ['engineering', 'manufacturing'] },
  { canonical: 'CATIA', synonyms: ['catia v5', 'dassault catia'], category: 'Engineering', industries: ['engineering', 'automotive', 'aviation'] },
  { canonical: 'Mechanical Design', synonyms: ['mechanical engineering design', 'machine design', 'mechanism design'], category: 'Engineering', industries: ['engineering', 'manufacturing'] },
  { canonical: 'Structural Analysis', synonyms: ['structural engineering', 'FEA', 'finite element analysis', 'stress analysis'], category: 'Engineering', industries: ['engineering', 'construction'] },
  { canonical: 'Process Engineering', synonyms: ['chemical engineering', 'process design', 'process optimization'], category: 'Engineering', industries: ['engineering', 'manufacturing'] },
  { canonical: 'Quality Control', synonyms: ['QC', 'quality assurance', 'QA', 'quality management', 'Six Sigma'], category: 'Engineering', industries: ['engineering', 'manufacturing'] },
  { canonical: 'Lean Manufacturing', synonyms: ['lean principles', 'kaizen', 'continuous improvement', 'lean six sigma'], category: 'Engineering', industries: ['engineering', 'manufacturing'] },
  { canonical: 'PLC Programming', synonyms: ['programmable logic controller', 'industrial automation', 'SCADA', 'ladder logic'], category: 'Engineering', industries: ['engineering', 'manufacturing'] },
  { canonical: 'Robotics', synonyms: ['robot programming', 'industrial robotics', 'robotic systems'], category: 'Engineering', industries: ['engineering', 'manufacturing'] },
  { canonical: 'Thermodynamics', synonyms: ['heat transfer', 'thermal engineering', 'thermal analysis'], category: 'Engineering', industries: ['engineering'] },
  { canonical: 'Fluid Mechanics', synonyms: ['hydraulics', 'pneumatics', 'fluid dynamics', 'CFD'], category: 'Engineering', industries: ['engineering'] },
  { canonical: 'GD&T', synonyms: ['geometric dimensioning', 'tolerancing', 'geometric dimensioning and tolerancing'], category: 'Engineering', industries: ['engineering', 'manufacturing'] },
  { canonical: 'Project Engineering', synonyms: ['engineering project management', 'EPC', 'engineering procurement construction'], category: 'Engineering', industries: ['engineering', 'construction'] },
  { canonical: 'Environmental Engineering', synonyms: ['environmental impact', 'EIA', 'waste management', 'environmental compliance'], category: 'Engineering', industries: ['engineering'] },
];

// ─── Accounting & Finance (Professional) ─────────────────────────────────────

export const ACCOUNTING_FINANCE: SkillEntry[] = [
  { canonical: 'Financial Reporting', synonyms: ['financial statements', 'GAAP reporting', 'IFRS reporting', 'annual reports'], category: 'Accounting & Finance', industries: ['accounting', 'finance'] },
  { canonical: 'Tax Preparation', synonyms: ['tax filing', 'tax planning', 'tax compliance', 'income tax'], category: 'Accounting & Finance', industries: ['accounting'] },
  { canonical: 'Auditing', synonyms: ['internal audit', 'external audit', 'financial audit', 'audit procedures'], category: 'Accounting & Finance', industries: ['accounting', 'finance'] },
  { canonical: 'Bookkeeping', synonyms: ['accounts payable', 'accounts receivable', 'AP/AR', 'general ledger'], category: 'Accounting & Finance', industries: ['accounting'] },
  { canonical: 'QuickBooks', synonyms: ['quickbooks online', 'QB', 'quickbooks pro'], category: 'Accounting & Finance', industries: ['accounting'] },
  { canonical: 'SAP', synonyms: ['SAP ERP', 'SAP FICO', 'SAP financial', 'SAP S/4HANA'], category: 'Accounting & Finance', industries: ['accounting', 'manufacturing', 'logistics'] },
  { canonical: 'CPA', synonyms: ['certified public accountant', 'CPA certification', 'CPA license'], category: 'Accounting & Finance', industries: ['accounting'] },
  { canonical: 'Budget Management', synonyms: ['budgeting', 'budget planning', 'financial planning', 'budget forecasting'], category: 'Accounting & Finance', industries: ['accounting', 'finance'] },
  { canonical: 'Payroll Processing', synonyms: ['payroll management', 'payroll administration', 'salary processing'], category: 'Accounting & Finance', industries: ['accounting', 'human-resources'] },
  { canonical: 'Financial Analysis', synonyms: ['financial modeling', 'financial forecasting', 'variance analysis', 'ratio analysis'], category: 'Accounting & Finance', industries: ['accounting', 'finance'] },
  { canonical: 'ERP Systems', synonyms: ['enterprise resource planning', 'Oracle ERP', 'NetSuite', 'ERP implementation'], category: 'Accounting & Finance', industries: ['accounting', 'manufacturing'] },
  { canonical: 'Accounts Reconciliation', synonyms: ['bank reconciliation', 'account reconciliation', 'ledger reconciliation'], category: 'Accounting & Finance', industries: ['accounting'] },
];

// ─── Healthcare Clinical ─────────────────────────────────────────────────────

export const HEALTHCARE_CLINICAL: SkillEntry[] = [
  { canonical: 'Patient Care', synonyms: ['patient management', 'bedside care', 'patient assessment', 'patient monitoring'], category: 'Healthcare Clinical', industries: ['healthcare'] },
  { canonical: 'Nursing', synonyms: ['registered nurse', 'RN', 'nursing care', 'clinical nursing', 'BSN'], category: 'Healthcare Clinical', industries: ['healthcare'] },
  { canonical: 'Phlebotomy', synonyms: ['blood draw', 'venipuncture', 'blood collection'], category: 'Healthcare Clinical', industries: ['healthcare'] },
  { canonical: 'Medical Coding', synonyms: ['ICD-10', 'CPT coding', 'medical billing', 'health information coding'], category: 'Healthcare Clinical', industries: ['healthcare'] },
  { canonical: 'Pharmacy', synonyms: ['pharmaceutical', 'medication management', 'drug dispensing', 'pharmacology'], category: 'Healthcare Clinical', industries: ['healthcare'] },
  { canonical: 'Physical Therapy', synonyms: ['physiotherapy', 'PT', 'rehabilitation therapy', 'manual therapy'], category: 'Healthcare Clinical', industries: ['healthcare'] },
  { canonical: 'Radiology', synonyms: ['X-ray', 'imaging', 'radiography', 'CT scan', 'MRI'], category: 'Healthcare Clinical', industries: ['healthcare'] },
  { canonical: 'Emergency Medicine', synonyms: ['emergency care', 'trauma care', 'ER', 'emergency room', 'acute care'], category: 'Healthcare Clinical', industries: ['healthcare'] },
  { canonical: 'Surgical Assistance', synonyms: ['surgical tech', 'operating room', 'OR assistance', 'surgical procedures'], category: 'Healthcare Clinical', industries: ['healthcare'] },
  { canonical: 'Vital Signs', synonyms: ['vital signs monitoring', 'blood pressure', 'temperature monitoring', 'pulse oximetry'], category: 'Healthcare Clinical', industries: ['healthcare'] },
  { canonical: 'Medical Records', synonyms: ['EMR management', 'health records', 'patient documentation', 'chart management'], category: 'Healthcare Clinical', industries: ['healthcare'] },
  { canonical: 'Infection Control', synonyms: ['infection prevention', 'sterile technique', 'aseptic technique', 'biosafety'], category: 'Healthcare Clinical', industries: ['healthcare'] },
  { canonical: 'Dental Hygiene', synonyms: ['dental care', 'oral hygiene', 'dental procedures', 'dental assistant'], category: 'Healthcare Clinical', industries: ['healthcare'] },
  { canonical: 'Occupational Therapy', synonyms: ['OT', 'occupational rehabilitation', 'functional therapy'], category: 'Healthcare Clinical', industries: ['healthcare'] },
  { canonical: 'Telehealth', synonyms: ['telemedicine', 'virtual care', 'remote patient care', 'virtual health'], category: 'Healthcare Clinical', industries: ['healthcare'] },
];

// ─── Manufacturing ───────────────────────────────────────────────────────────

export const MANUFACTURING: SkillEntry[] = [
  { canonical: 'CNC Machining', synonyms: ['CNC programming', 'CNC operation', 'computer numerical control', 'CNC milling'], category: 'Manufacturing', industries: ['manufacturing'] },
  { canonical: 'Assembly Line', synonyms: ['production line', 'assembly operations', 'line production'], category: 'Manufacturing', industries: ['manufacturing'] },
  { canonical: 'ISO 9001', synonyms: ['ISO certification', 'quality management system', 'QMS', 'ISO standards'], category: 'Manufacturing', industries: ['manufacturing', 'engineering'] },
  { canonical: 'Supply Chain Management', synonyms: ['SCM', 'supply chain optimization', 'supply chain planning'], category: 'Manufacturing', industries: ['manufacturing', 'logistics'] },
  { canonical: '5S Methodology', synonyms: ['5S', 'workplace organization', '5S lean', 'sort set shine'], category: 'Manufacturing', industries: ['manufacturing'] },
  { canonical: 'Production Planning', synonyms: ['production scheduling', 'manufacturing planning', 'MRP', 'material requirements planning'], category: 'Manufacturing', industries: ['manufacturing'] },
  { canonical: 'Injection Molding', synonyms: ['plastic molding', 'mold operation', 'molding machine operation'], category: 'Manufacturing', industries: ['manufacturing'] },
  { canonical: 'Packaging', synonyms: ['product packaging', 'packaging design', 'packaging operations'], category: 'Manufacturing', industries: ['manufacturing', 'logistics'] },
  { canonical: 'Warehouse Management', synonyms: ['WMS', 'warehouse operations', 'warehouse logistics', 'storage management'], category: 'Manufacturing', industries: ['manufacturing', 'logistics'] },
  { canonical: 'Safety Management', synonyms: ['workplace safety', 'EHS', 'environment health safety', 'safety protocols'], category: 'Manufacturing', industries: ['manufacturing', 'construction'] },
  { canonical: 'Statistical Process Control', synonyms: ['SPC', 'process control', 'control charts', 'quality statistics'], category: 'Manufacturing', industries: ['manufacturing', 'engineering'] },
  { canonical: 'Tool & Die', synonyms: ['tool making', 'die making', 'tooling', 'fixture design'], category: 'Manufacturing', industries: ['manufacturing'] },
];

// ─── Logistics & Supply Chain ────────────────────────────────────────────────

export const LOGISTICS_SUPPLY_CHAIN: SkillEntry[] = [
  { canonical: 'Freight Management', synonyms: ['freight forwarding', 'shipping management', 'cargo management', 'freight logistics'], category: 'Logistics & Supply Chain', industries: ['logistics'] },
  { canonical: 'Route Planning', synonyms: ['route optimization', 'delivery planning', 'transportation planning', 'fleet routing'], category: 'Logistics & Supply Chain', industries: ['logistics'] },
  { canonical: 'Customs Clearance', synonyms: ['customs brokerage', 'import/export', 'trade compliance', 'customs documentation'], category: 'Logistics & Supply Chain', industries: ['logistics'] },
  { canonical: 'Fleet Management', synonyms: ['vehicle fleet', 'fleet operations', 'fleet maintenance', 'transportation management'], category: 'Logistics & Supply Chain', industries: ['logistics'] },
  { canonical: 'Procurement', synonyms: ['purchasing', 'vendor management', 'supplier management', 'sourcing'], category: 'Logistics & Supply Chain', industries: ['logistics', 'manufacturing'] },
  { canonical: 'Last Mile Delivery', synonyms: ['last mile logistics', 'delivery operations', 'distribution management'], category: 'Logistics & Supply Chain', industries: ['logistics'] },
  { canonical: 'Cold Chain', synonyms: ['cold chain logistics', 'temperature controlled', 'refrigerated transport'], category: 'Logistics & Supply Chain', industries: ['logistics', 'culinary-hospitality'] },
  { canonical: 'Demand Forecasting', synonyms: ['demand planning', 'sales forecasting', 'inventory forecasting'], category: 'Logistics & Supply Chain', industries: ['logistics', 'manufacturing'] },
  { canonical: 'Cross-Docking', synonyms: ['cross dock', 'transshipment', 'hub operations'], category: 'Logistics & Supply Chain', industries: ['logistics'] },
  { canonical: 'Third-Party Logistics', synonyms: ['3PL', '3PL management', 'outsourced logistics', 'logistics partners'], category: 'Logistics & Supply Chain', industries: ['logistics'] },
  { canonical: 'Forklift Operation', synonyms: ['forklift certified', 'forklift license', 'material handling'], category: 'Logistics & Supply Chain', industries: ['logistics', 'manufacturing'] },
  { canonical: 'Dispatch', synonyms: ['dispatching', 'load dispatching', 'truck dispatching', 'dispatch coordination'], category: 'Logistics & Supply Chain', industries: ['logistics'] },
];

// ─── Public Relations ────────────────────────────────────────────────────────

export const PUBLIC_RELATIONS: SkillEntry[] = [
  { canonical: 'Media Relations', synonyms: ['press relations', 'media outreach', 'journalist relations', 'press management'], category: 'Sales & Marketing', industries: ['public-relations'] },
  { canonical: 'Press Releases', synonyms: ['press release writing', 'media releases', 'news releases'], category: 'Sales & Marketing', industries: ['public-relations'] },
  { canonical: 'Crisis Communication', synonyms: ['crisis management', 'crisis PR', 'reputation management'], category: 'Sales & Marketing', industries: ['public-relations'] },
  { canonical: 'Event Planning', synonyms: ['event management', 'event coordination', 'event organization', 'conference planning'], category: 'Sales & Marketing', industries: ['public-relations', 'culinary-hospitality'] },
  { canonical: 'Corporate Communications', synonyms: ['internal communications', 'corporate messaging', 'executive communications'], category: 'Sales & Marketing', industries: ['public-relations'] },
  { canonical: 'Influencer Marketing', synonyms: ['influencer relations', 'influencer outreach', 'KOL management'], category: 'Sales & Marketing', industries: ['public-relations', 'sales-marketing'] },
  { canonical: 'Stakeholder Engagement', synonyms: ['stakeholder management', 'stakeholder communication', 'community relations'], category: 'Sales & Marketing', industries: ['public-relations'] },
  { canonical: 'Speech Writing', synonyms: ['public speaking preparation', 'executive speech', 'keynote preparation'], category: 'Sales & Marketing', industries: ['public-relations'] },
];

// ─── Retail & Service ────────────────────────────────────────────────────────

export const RETAIL_SERVICE: SkillEntry[] = [
  { canonical: 'Customer Service', synonyms: ['client service', 'customer support', 'customer assistance', 'customer care'], category: 'Sales & Marketing', industries: ['sales-marketing', 'culinary-hospitality'] },
  { canonical: 'POS Operations', synonyms: ['POS systems', 'point of sale', 'cash register', 'POS terminal'], category: 'Sales & Marketing', industries: ['sales-marketing', 'culinary-hospitality'] },
  { canonical: 'Cash Handling', synonyms: ['cash management', 'cashiering', 'cashier', 'money handling'], category: 'Sales & Marketing', industries: ['sales-marketing', 'culinary-hospitality'] },
  { canonical: 'Visual Merchandising', synonyms: ['merchandising', 'product display', 'store layout'], category: 'Sales & Marketing', industries: ['sales-marketing'] },
  { canonical: 'Retail Management', synonyms: ['retail operations', 'store management', 'shop management'], category: 'Sales & Marketing', industries: ['sales-marketing'] },
  { canonical: 'Stock Management', synonyms: ['stock control', 'stock shelving', 'FIFO', 'stock rotation'], category: 'Logistics & Supply Chain', industries: ['sales-marketing', 'logistics'] },
  { canonical: 'Digital Payments', synonyms: ['mobile payments', 'e-wallet', 'GCash', 'Maya', 'electronic payments', 'contactless payments'], category: 'Sales & Marketing', industries: ['sales-marketing', 'culinary-hospitality'] },
  { canonical: 'Barcode Systems', synonyms: ['barcode scanner', 'scanner systems', 'barcode reader'], category: 'Sales & Marketing', industries: ['sales-marketing', 'logistics'] },
  { canonical: 'Customer Relations', synonyms: ['client relations', 'interpersonal communication', 'customer engagement'], category: 'Sales & Marketing', industries: ['sales-marketing', 'culinary-hospitality'] },
  { canonical: 'Food Service', synonyms: ['food handling', 'food preparation', 'food serving'], category: 'Culinary & Hospitality', industries: ['culinary-hospitality'] },
  { canonical: 'Loss Prevention', synonyms: ['shrinkage prevention', 'theft prevention', 'asset protection'], category: 'Sales & Marketing', industries: ['sales-marketing'] },
  { canonical: 'Upselling', synonyms: ['cross-selling', 'suggestive selling', 'add-on sales'], category: 'Sales & Marketing', industries: ['sales-marketing', 'culinary-hospitality'] },
  { canonical: 'Store Operations', synonyms: ['floor management', 'shop operations', 'retail floor'], category: 'Sales & Marketing', industries: ['sales-marketing'] },
  { canonical: 'Receipt Balancing', synonyms: ['cash balancing', 'till reconciliation', 'register balancing'], category: 'Accounting & Finance', industries: ['sales-marketing', 'accounting'] },
];
