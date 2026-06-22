/**
 * Skills Taxonomy Module
 *
 * Static taxonomy of 200+ skill entries across 8 industry categories.
 * Pre-builds a lookup map at module load time for O(1) synonym resolution.
 * No runtime I/O — the taxonomy is compiled into the bundle.
 *
 * Requirements: 12.1, 12.2, 12.3, 12.5, 12.7, 12.8
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
  | 'Other';

export type IndustryId =
  | 'software-engineering'
  | 'data-science'
  | 'devops'
  | 'finance'
  | 'healthcare'
  | 'cybersecurity'
  | 'mobile-development'
  | 'game-development';

export interface SkillEntry {
  canonical: string;
  synonyms: string[];
  category: SkillCategory;
  industries: IndustryId[];
}

// ─── Programming Languages ───────────────────────────────────────────────────

const PROGRAMMING_LANGUAGES: SkillEntry[] = [
  { canonical: 'Python', synonyms: ['python3', 'py', 'python 3'], category: 'Programming Languages', industries: ['software-engineering', 'data-science', 'devops', 'finance', 'cybersecurity'] },
  { canonical: 'JavaScript', synonyms: ['js', 'ES6', 'ES2015', 'ECMAScript', 'ecmascript'], category: 'Programming Languages', industries: ['software-engineering', 'mobile-development', 'game-development'] },
  { canonical: 'TypeScript', synonyms: ['ts', 'TS'], category: 'Programming Languages', industries: ['software-engineering', 'mobile-development'] },
  { canonical: 'Java', synonyms: ['java8', 'java11', 'java17', 'jdk', 'JDK'], category: 'Programming Languages', industries: ['software-engineering', 'finance', 'healthcare'] },
  { canonical: 'C#', synonyms: ['csharp', 'c-sharp', 'C Sharp', 'dotnet C#'], category: 'Programming Languages', industries: ['software-engineering', 'game-development', 'finance'] },
  { canonical: 'C++', synonyms: ['cpp', 'cplusplus', 'c plus plus'], category: 'Programming Languages', industries: ['software-engineering', 'game-development', 'cybersecurity'] },
  { canonical: 'C', synonyms: ['c language', 'ansi c'], category: 'Programming Languages', industries: ['software-engineering', 'cybersecurity', 'game-development'] },
  { canonical: 'Go', synonyms: ['golang', 'go lang'], category: 'Programming Languages', industries: ['software-engineering', 'devops', 'cybersecurity'] },
  { canonical: 'Rust', synonyms: ['rust-lang', 'rustlang'], category: 'Programming Languages', industries: ['software-engineering', 'cybersecurity', 'game-development'] },
  { canonical: 'Ruby', synonyms: ['rb'], category: 'Programming Languages', industries: ['software-engineering'] },
  { canonical: 'PHP', synonyms: ['php8', 'php7'], category: 'Programming Languages', industries: ['software-engineering'] },
  { canonical: 'Swift', synonyms: ['swift5', 'swiftlang'], category: 'Programming Languages', industries: ['software-engineering', 'mobile-development'] },
  { canonical: 'Kotlin', synonyms: ['kt', 'kotlin/jvm'], category: 'Programming Languages', industries: ['software-engineering', 'mobile-development'] },
  { canonical: 'Scala', synonyms: ['scala3'], category: 'Programming Languages', industries: ['software-engineering', 'data-science', 'finance'] },
  { canonical: 'R', synonyms: ['r language', 'rlang', 'R programming'], category: 'Programming Languages', industries: ['data-science', 'healthcare', 'finance'] },
  { canonical: 'Dart', synonyms: ['dartlang'], category: 'Programming Languages', industries: ['software-engineering', 'mobile-development'] },
  { canonical: 'Lua', synonyms: ['lua5'], category: 'Programming Languages', industries: ['game-development', 'software-engineering'] },
  { canonical: 'Perl', synonyms: ['perl5', 'perl6'], category: 'Programming Languages', industries: ['software-engineering', 'devops'] },
  { canonical: 'Haskell', synonyms: ['hs'], category: 'Programming Languages', industries: ['software-engineering', 'finance'] },
  { canonical: 'Elixir', synonyms: ['elixir-lang'], category: 'Programming Languages', industries: ['software-engineering'] },
  { canonical: 'SQL', synonyms: ['structured query language'], category: 'Programming Languages', industries: ['software-engineering', 'data-science', 'finance', 'healthcare'] },
  { canonical: 'Bash', synonyms: ['shell scripting', 'shell script', 'sh', 'bash scripting'], category: 'Programming Languages', industries: ['software-engineering', 'devops', 'cybersecurity'] },
  { canonical: 'PowerShell', synonyms: ['pwsh', 'ps1'], category: 'Programming Languages', industries: ['devops', 'cybersecurity'] },
  { canonical: 'Objective-C', synonyms: ['objc', 'obj-c'], category: 'Programming Languages', industries: ['software-engineering', 'mobile-development'] },
  { canonical: 'MATLAB', synonyms: ['matlab'], category: 'Programming Languages', industries: ['data-science', 'healthcare'] },
];

// ─── Frameworks ──────────────────────────────────────────────────────────────

const FRAMEWORKS: SkillEntry[] = [
  { canonical: 'React', synonyms: ['reactjs', 'react.js', 'react js'], category: 'Frameworks', industries: ['software-engineering', 'mobile-development'] },
  { canonical: 'Angular', synonyms: ['angularjs', 'angular.js', 'angular 2+'], category: 'Frameworks', industries: ['software-engineering'] },
  { canonical: 'Vue.js', synonyms: ['vue', 'vuejs', 'vue 3'], category: 'Frameworks', industries: ['software-engineering'] },
  { canonical: 'Next.js', synonyms: ['nextjs', 'next js', 'next'], category: 'Frameworks', industries: ['software-engineering'] },
  { canonical: 'Svelte', synonyms: ['sveltejs', 'sveltekit'], category: 'Frameworks', industries: ['software-engineering'] },
  { canonical: 'Django', synonyms: ['django framework', 'django rest framework', 'DRF'], category: 'Frameworks', industries: ['software-engineering', 'data-science'] },
  { canonical: 'Flask', synonyms: ['flask framework', 'python flask'], category: 'Frameworks', industries: ['software-engineering', 'data-science'] },
  { canonical: 'FastAPI', synonyms: ['fast api', 'fastapi framework'], category: 'Frameworks', industries: ['software-engineering', 'data-science'] },
  { canonical: 'Spring', synonyms: ['spring boot', 'spring framework', 'springboot'], category: 'Frameworks', industries: ['software-engineering', 'finance'] },
  { canonical: 'Express.js', synonyms: ['express', 'expressjs'], category: 'Frameworks', industries: ['software-engineering'] },
  { canonical: 'NestJS', synonyms: ['nest.js', 'nest js'], category: 'Frameworks', industries: ['software-engineering'] },
  { canonical: 'Ruby on Rails', synonyms: ['rails', 'ror', 'ruby rails'], category: 'Frameworks', industries: ['software-engineering'] },
  { canonical: 'ASP.NET', synonyms: ['asp.net core', 'aspnet', 'asp net', 'dotnet'], category: 'Frameworks', industries: ['software-engineering', 'finance'] },
  { canonical: 'Laravel', synonyms: ['laravel framework', 'php laravel'], category: 'Frameworks', industries: ['software-engineering'] },
  { canonical: 'Flutter', synonyms: ['flutter sdk', 'flutter framework'], category: 'Frameworks', industries: ['software-engineering', 'mobile-development'] },
  { canonical: 'React Native', synonyms: ['react-native', 'RN', 'reactnative'], category: 'Frameworks', industries: ['software-engineering', 'mobile-development'] },
  { canonical: 'Electron', synonyms: ['electron.js', 'electronjs'], category: 'Frameworks', industries: ['software-engineering'] },
  { canonical: 'jQuery', synonyms: ['jquery'], category: 'Frameworks', industries: ['software-engineering'] },
  { canonical: 'Tailwind CSS', synonyms: ['tailwind', 'tailwindcss'], category: 'Frameworks', industries: ['software-engineering'] },
  { canonical: 'Bootstrap', synonyms: ['bootstrap 5', 'twitter bootstrap'], category: 'Frameworks', industries: ['software-engineering'] },
  { canonical: 'Unity', synonyms: ['unity3d', 'unity engine', 'unity game engine'], category: 'Frameworks', industries: ['game-development'] },
  { canonical: 'Unreal Engine', synonyms: ['unreal', 'UE4', 'UE5', 'unreal 5'], category: 'Frameworks', industries: ['game-development'] },
  { canonical: 'Gatsby', synonyms: ['gatsbyjs', 'gatsby.js'], category: 'Frameworks', industries: ['software-engineering'] },
  { canonical: 'Nuxt.js', synonyms: ['nuxt', 'nuxtjs'], category: 'Frameworks', industries: ['software-engineering'] },
  { canonical: 'Remix', synonyms: ['remix.run', 'remix framework'], category: 'Frameworks', industries: ['software-engineering'] },
];

// ─── Cloud Platforms ─────────────────────────────────────────────────────────

const CLOUD_PLATFORMS: SkillEntry[] = [
  { canonical: 'Amazon Web Services', synonyms: ['AWS', 'aws', 'amazon aws'], category: 'Cloud Platforms', industries: ['software-engineering', 'devops', 'data-science', 'finance', 'healthcare'] },
  { canonical: 'Microsoft Azure', synonyms: ['Azure', 'azure', 'MS Azure'], category: 'Cloud Platforms', industries: ['software-engineering', 'devops', 'finance', 'healthcare'] },
  { canonical: 'Google Cloud Platform', synonyms: ['GCP', 'gcp', 'google cloud'], category: 'Cloud Platforms', industries: ['software-engineering', 'devops', 'data-science'] },
  { canonical: 'AWS Lambda', synonyms: ['lambda', 'serverless lambda'], category: 'Cloud Platforms', industries: ['software-engineering', 'devops'] },
  { canonical: 'AWS S3', synonyms: ['S3', 'amazon s3', 'simple storage service'], category: 'Cloud Platforms', industries: ['software-engineering', 'devops', 'data-science'] },
  { canonical: 'AWS EC2', synonyms: ['EC2', 'elastic compute cloud'], category: 'Cloud Platforms', industries: ['software-engineering', 'devops'] },
  { canonical: 'Azure DevOps', synonyms: ['ADO', 'azure devops services'], category: 'Cloud Platforms', industries: ['software-engineering', 'devops'] },
  { canonical: 'Google BigQuery', synonyms: ['BigQuery', 'bigquery'], category: 'Cloud Platforms', industries: ['data-science', 'software-engineering'] },
  { canonical: 'Heroku', synonyms: ['heroku platform'], category: 'Cloud Platforms', industries: ['software-engineering'] },
  { canonical: 'DigitalOcean', synonyms: ['digital ocean', 'DO'], category: 'Cloud Platforms', industries: ['software-engineering', 'devops'] },
  { canonical: 'Vercel', synonyms: ['vercel platform', 'zeit'], category: 'Cloud Platforms', industries: ['software-engineering'] },
  { canonical: 'Netlify', synonyms: ['netlify platform'], category: 'Cloud Platforms', industries: ['software-engineering'] },
  { canonical: 'Cloudflare', synonyms: ['cloudflare workers', 'CF'], category: 'Cloud Platforms', industries: ['software-engineering', 'devops', 'cybersecurity'] },
  { canonical: 'Firebase', synonyms: ['google firebase', 'firebase platform'], category: 'Cloud Platforms', industries: ['software-engineering', 'mobile-development'] },
  { canonical: 'Supabase', synonyms: ['supabase platform'], category: 'Cloud Platforms', industries: ['software-engineering'] },
];

// ─── Databases ───────────────────────────────────────────────────────────────

const DATABASES: SkillEntry[] = [
  { canonical: 'PostgreSQL', synonyms: ['postgres', 'psql', 'pg'], category: 'Databases', industries: ['software-engineering', 'data-science', 'finance', 'healthcare'] },
  { canonical: 'MySQL', synonyms: ['mysql', 'my sql'], category: 'Databases', industries: ['software-engineering', 'finance'] },
  { canonical: 'MongoDB', synonyms: ['mongo', 'mongodb atlas'], category: 'Databases', industries: ['software-engineering', 'data-science'] },
  { canonical: 'Redis', synonyms: ['redis cache', 'redis db'], category: 'Databases', industries: ['software-engineering', 'devops'] },
  { canonical: 'Elasticsearch', synonyms: ['elastic search', 'ES', 'elastic'], category: 'Databases', industries: ['software-engineering', 'data-science', 'cybersecurity'] },
  { canonical: 'SQLite', synonyms: ['sqlite3'], category: 'Databases', industries: ['software-engineering', 'mobile-development'] },
  { canonical: 'Oracle Database', synonyms: ['oracle', 'oracle db', 'OracleDB'], category: 'Databases', industries: ['software-engineering', 'finance', 'healthcare'] },
  { canonical: 'Microsoft SQL Server', synonyms: ['MSSQL', 'SQL Server', 'mssql', 'sql server'], category: 'Databases', industries: ['software-engineering', 'finance', 'healthcare'] },
  { canonical: 'DynamoDB', synonyms: ['dynamo db', 'aws dynamodb', 'amazon dynamodb'], category: 'Databases', industries: ['software-engineering', 'devops'] },
  { canonical: 'Cassandra', synonyms: ['apache cassandra'], category: 'Databases', industries: ['software-engineering', 'data-science'] },
  { canonical: 'Neo4j', synonyms: ['neo4j graph database'], category: 'Databases', industries: ['software-engineering', 'data-science'] },
  { canonical: 'CouchDB', synonyms: ['apache couchdb', 'couch db'], category: 'Databases', industries: ['software-engineering'] },
  { canonical: 'MariaDB', synonyms: ['maria db'], category: 'Databases', industries: ['software-engineering'] },
  { canonical: 'InfluxDB', synonyms: ['influx db', 'influxdata'], category: 'Databases', industries: ['software-engineering', 'devops'] },
  { canonical: 'Snowflake', synonyms: ['snowflake db', 'snowflake data cloud'], category: 'Databases', industries: ['data-science', 'finance'] },
];

// ─── DevOps ──────────────────────────────────────────────────────────────────

const DEVOPS: SkillEntry[] = [
  { canonical: 'Docker', synonyms: ['docker container', 'docker engine', 'containerization'], category: 'DevOps', industries: ['software-engineering', 'devops', 'data-science'] },
  { canonical: 'Kubernetes', synonyms: ['k8s', 'kube', 'K8s'], category: 'DevOps', industries: ['software-engineering', 'devops'] },
  { canonical: 'Terraform', synonyms: ['terraform iac', 'hashicorp terraform', 'tf'], category: 'DevOps', industries: ['software-engineering', 'devops'] },
  { canonical: 'Ansible', synonyms: ['ansible automation', 'red hat ansible'], category: 'DevOps', industries: ['devops', 'cybersecurity'] },
  { canonical: 'Jenkins', synonyms: ['jenkins ci', 'jenkins pipeline'], category: 'DevOps', industries: ['software-engineering', 'devops'] },
  { canonical: 'GitHub Actions', synonyms: ['gh actions', 'github workflows'], category: 'DevOps', industries: ['software-engineering', 'devops'] },
  { canonical: 'GitLab CI/CD', synonyms: ['gitlab ci', 'gitlab pipelines'], category: 'DevOps', industries: ['software-engineering', 'devops'] },
  { canonical: 'CircleCI', synonyms: ['circle ci'], category: 'DevOps', industries: ['software-engineering', 'devops'] },
  { canonical: 'Helm', synonyms: ['helm charts', 'kubernetes helm'], category: 'DevOps', industries: ['devops'] },
  { canonical: 'Prometheus', synonyms: ['prometheus monitoring'], category: 'DevOps', industries: ['devops', 'software-engineering'] },
  { canonical: 'Grafana', synonyms: ['grafana dashboards'], category: 'DevOps', industries: ['devops', 'software-engineering'] },
  { canonical: 'Nginx', synonyms: ['nginx server', 'nginx reverse proxy'], category: 'DevOps', industries: ['software-engineering', 'devops'] },
  { canonical: 'Apache Kafka', synonyms: ['kafka', 'kafka streaming'], category: 'DevOps', industries: ['software-engineering', 'data-science', 'finance'] },
  { canonical: 'RabbitMQ', synonyms: ['rabbit mq', 'rabbitmq messaging'], category: 'DevOps', industries: ['software-engineering', 'devops'] },
  { canonical: 'Vault', synonyms: ['hashicorp vault', 'secrets management'], category: 'DevOps', industries: ['devops', 'cybersecurity'] },
  { canonical: 'Pulumi', synonyms: ['pulumi iac'], category: 'DevOps', industries: ['devops', 'software-engineering'] },
  { canonical: 'ArgoCD', synonyms: ['argo cd', 'argo-cd', 'argocd gitops'], category: 'DevOps', industries: ['devops'] },
  { canonical: 'Datadog', synonyms: ['datadog monitoring', 'dd'], category: 'DevOps', industries: ['devops', 'software-engineering'] },
  { canonical: 'New Relic', synonyms: ['newrelic', 'new relic monitoring'], category: 'DevOps', industries: ['devops', 'software-engineering'] },
  { canonical: 'Git', synonyms: ['git version control', 'git scm'], category: 'DevOps', industries: ['software-engineering', 'devops', 'data-science'] },
];

// ─── Data Science ────────────────────────────────────────────────────────────

const DATA_SCIENCE: SkillEntry[] = [
  { canonical: 'Machine Learning', synonyms: ['ML', 'ml', 'machine-learning'], category: 'Data Science', industries: ['data-science', 'software-engineering', 'finance', 'healthcare'] },
  { canonical: 'Deep Learning', synonyms: ['DL', 'dl', 'deep-learning'], category: 'Data Science', industries: ['data-science', 'healthcare'] },
  { canonical: 'TensorFlow', synonyms: ['tensorflow 2', 'tf', 'tensor flow'], category: 'Data Science', industries: ['data-science', 'software-engineering'] },
  { canonical: 'PyTorch', synonyms: ['pytorch', 'py torch', 'torch'], category: 'Data Science', industries: ['data-science', 'software-engineering'] },
  { canonical: 'Scikit-learn', synonyms: ['sklearn', 'scikit learn', 'sk-learn'], category: 'Data Science', industries: ['data-science'] },
  { canonical: 'Pandas', synonyms: ['python pandas'], category: 'Data Science', industries: ['data-science', 'finance'] },
  { canonical: 'NumPy', synonyms: ['numpy', 'np'], category: 'Data Science', industries: ['data-science'] },
  { canonical: 'Apache Spark', synonyms: ['spark', 'pyspark', 'spark sql'], category: 'Data Science', industries: ['data-science', 'software-engineering', 'finance'] },
  { canonical: 'Natural Language Processing', synonyms: ['NLP', 'nlp', 'text mining'], category: 'Data Science', industries: ['data-science', 'software-engineering'] },
  { canonical: 'Computer Vision', synonyms: ['CV', 'cv', 'image recognition'], category: 'Data Science', industries: ['data-science', 'healthcare'] },
  { canonical: 'Data Visualization', synonyms: ['data viz', 'dataviz'], category: 'Data Science', industries: ['data-science', 'finance'] },
  { canonical: 'Tableau', synonyms: ['tableau desktop', 'tableau server'], category: 'Data Science', industries: ['data-science', 'finance'] },
  { canonical: 'Power BI', synonyms: ['powerbi', 'power bi desktop', 'microsoft power bi'], category: 'Data Science', industries: ['data-science', 'finance'] },
  { canonical: 'Apache Hadoop', synonyms: ['hadoop', 'hdfs', 'hadoop ecosystem'], category: 'Data Science', industries: ['data-science', 'software-engineering'] },
  { canonical: 'Jupyter', synonyms: ['jupyter notebook', 'jupyter lab', 'ipython'], category: 'Data Science', industries: ['data-science'] },
  { canonical: 'Keras', synonyms: ['keras api'], category: 'Data Science', industries: ['data-science'] },
  { canonical: 'XGBoost', synonyms: ['xgboost', 'extreme gradient boosting'], category: 'Data Science', industries: ['data-science', 'finance'] },
  { canonical: 'Feature Engineering', synonyms: ['feature extraction'], category: 'Data Science', industries: ['data-science'] },
  { canonical: 'Data Pipeline', synonyms: ['ETL', 'etl', 'data engineering', 'data pipelines'], category: 'Data Science', industries: ['data-science', 'software-engineering', 'finance'] },
  { canonical: 'MLOps', synonyms: ['ml ops', 'machine learning operations'], category: 'Data Science', industries: ['data-science', 'devops'] },
];

// ─── Design ──────────────────────────────────────────────────────────────────

const DESIGN: SkillEntry[] = [
  { canonical: 'Figma', synonyms: ['figma design'], category: 'Design', industries: ['software-engineering', 'mobile-development'] },
  { canonical: 'Adobe XD', synonyms: ['xd', 'adobexd'], category: 'Design', industries: ['software-engineering', 'mobile-development'] },
  { canonical: 'Sketch', synonyms: ['sketch app'], category: 'Design', industries: ['software-engineering', 'mobile-development'] },
  { canonical: 'UI/UX Design', synonyms: ['ui design', 'ux design', 'ui/ux', 'user experience', 'user interface design'], category: 'Design', industries: ['software-engineering', 'mobile-development'] },
  { canonical: 'Responsive Design', synonyms: ['responsive web design', 'mobile-first design'], category: 'Design', industries: ['software-engineering'] },
  { canonical: 'Wireframing', synonyms: ['wireframes', 'low-fidelity design'], category: 'Design', industries: ['software-engineering', 'mobile-development'] },
  { canonical: 'Prototyping', synonyms: ['rapid prototyping', 'interactive prototyping'], category: 'Design', industries: ['software-engineering', 'mobile-development'] },
  { canonical: 'Design Systems', synonyms: ['component library', 'design tokens'], category: 'Design', industries: ['software-engineering'] },
  { canonical: 'Adobe Photoshop', synonyms: ['photoshop', 'ps'], category: 'Design', industries: ['software-engineering', 'game-development'] },
  { canonical: 'Adobe Illustrator', synonyms: ['illustrator', 'ai'], category: 'Design', industries: ['software-engineering', 'game-development'] },
];

// ─── Testing ─────────────────────────────────────────────────────────────────

const TESTING: SkillEntry[] = [
  { canonical: 'Jest', synonyms: ['jestjs', 'jest framework'], category: 'Testing', industries: ['software-engineering'] },
  { canonical: 'Vitest', synonyms: ['vitest framework'], category: 'Testing', industries: ['software-engineering'] },
  { canonical: 'Cypress', synonyms: ['cypress.io', 'cypress testing'], category: 'Testing', industries: ['software-engineering'] },
  { canonical: 'Playwright', synonyms: ['playwright testing', 'ms playwright'], category: 'Testing', industries: ['software-engineering'] },
  { canonical: 'Selenium', synonyms: ['selenium webdriver', 'selenium testing'], category: 'Testing', industries: ['software-engineering'] },
  { canonical: 'pytest', synonyms: ['py.test', 'python testing'], category: 'Testing', industries: ['software-engineering', 'data-science'] },
  { canonical: 'JUnit', synonyms: ['junit5', 'junit 5'], category: 'Testing', industries: ['software-engineering'] },
  { canonical: 'Mocha', synonyms: ['mochajs', 'mocha testing'], category: 'Testing', industries: ['software-engineering'] },
  { canonical: 'Test-Driven Development', synonyms: ['TDD', 'tdd', 'test driven development'], category: 'Testing', industries: ['software-engineering'] },
  { canonical: 'Behavior-Driven Development', synonyms: ['BDD', 'bdd', 'behavior driven development'], category: 'Testing', industries: ['software-engineering'] },
  { canonical: 'Unit Testing', synonyms: ['unit tests'], category: 'Testing', industries: ['software-engineering'] },
  { canonical: 'Integration Testing', synonyms: ['integration tests', 'e2e testing', 'end-to-end testing'], category: 'Testing', industries: ['software-engineering'] },
  { canonical: 'Load Testing', synonyms: ['performance testing', 'stress testing'], category: 'Testing', industries: ['software-engineering', 'devops'] },
  { canonical: 'JMeter', synonyms: ['apache jmeter'], category: 'Testing', industries: ['software-engineering', 'devops'] },
  { canonical: 'Postman', synonyms: ['postman api', 'api testing'], category: 'Testing', industries: ['software-engineering'] },
];

// ─── Security ────────────────────────────────────────────────────────────────

const SECURITY: SkillEntry[] = [
  { canonical: 'Penetration Testing', synonyms: ['pentest', 'pen testing', 'ethical hacking'], category: 'Security', industries: ['cybersecurity'] },
  { canonical: 'OWASP', synonyms: ['owasp top 10', 'web security'], category: 'Security', industries: ['cybersecurity', 'software-engineering'] },
  { canonical: 'Network Security', synonyms: ['netsec', 'network defense'], category: 'Security', industries: ['cybersecurity'] },
  { canonical: 'Cryptography', synonyms: ['encryption', 'crypto', 'cryptographic protocols'], category: 'Security', industries: ['cybersecurity', 'finance'] },
  { canonical: 'SOC', synonyms: ['security operations center', 'security operations'], category: 'Security', industries: ['cybersecurity'] },
  { canonical: 'SIEM', synonyms: ['security information and event management', 'splunk', 'siem tools'], category: 'Security', industries: ['cybersecurity'] },
  { canonical: 'Incident Response', synonyms: ['IR', 'incident handling', 'security incident response'], category: 'Security', industries: ['cybersecurity'] },
  { canonical: 'Vulnerability Assessment', synonyms: ['vuln assessment', 'vulnerability scanning'], category: 'Security', industries: ['cybersecurity'] },
  { canonical: 'Firewall Management', synonyms: ['firewall configuration', 'network firewalls'], category: 'Security', industries: ['cybersecurity'] },
  { canonical: 'Identity and Access Management', synonyms: ['IAM', 'iam', 'access management'], category: 'Security', industries: ['cybersecurity', 'devops'] },
  { canonical: 'OAuth', synonyms: ['oauth 2.0', 'oauth2', 'open authorization'], category: 'Security', industries: ['software-engineering', 'cybersecurity'] },
  { canonical: 'SSL/TLS', synonyms: ['ssl', 'tls', 'https certificates'], category: 'Security', industries: ['software-engineering', 'cybersecurity'] },
  { canonical: 'Compliance', synonyms: ['HIPAA', 'GDPR', 'SOC 2', 'regulatory compliance'], category: 'Security', industries: ['cybersecurity', 'healthcare', 'finance'] },
  { canonical: 'Malware Analysis', synonyms: ['malware reverse engineering', 'threat analysis'], category: 'Security', industries: ['cybersecurity'] },
  { canonical: 'Zero Trust', synonyms: ['zero trust architecture', 'zero trust security'], category: 'Security', industries: ['cybersecurity'] },
];

// ─── Mobile ──────────────────────────────────────────────────────────────────

const MOBILE: SkillEntry[] = [
  { canonical: 'iOS Development', synonyms: ['ios', 'ios dev', 'iPhone development'], category: 'Mobile', industries: ['mobile-development', 'software-engineering'] },
  { canonical: 'Android Development', synonyms: ['android', 'android dev', 'android sdk'], category: 'Mobile', industries: ['mobile-development', 'software-engineering'] },
  { canonical: 'SwiftUI', synonyms: ['swift ui', 'swiftui framework'], category: 'Mobile', industries: ['mobile-development'] },
  { canonical: 'Jetpack Compose', synonyms: ['compose', 'android compose', 'jetpack'], category: 'Mobile', industries: ['mobile-development'] },
  { canonical: 'Xamarin', synonyms: ['xamarin forms', 'xamarin.forms'], category: 'Mobile', industries: ['mobile-development'] },
  { canonical: 'Ionic', synonyms: ['ionic framework', 'ionic angular'], category: 'Mobile', industries: ['mobile-development'] },
  { canonical: 'App Store Optimization', synonyms: ['ASO', 'aso', 'app store seo'], category: 'Mobile', industries: ['mobile-development'] },
  { canonical: 'Mobile UI Design', synonyms: ['mobile design', 'mobile user interface'], category: 'Mobile', industries: ['mobile-development'] },
  { canonical: 'Push Notifications', synonyms: ['mobile notifications', 'FCM', 'APNs'], category: 'Mobile', industries: ['mobile-development'] },
  { canonical: 'CoreData', synonyms: ['core data', 'ios persistence'], category: 'Mobile', industries: ['mobile-development'] },
];

// ─── Soft Skills ─────────────────────────────────────────────────────────────

const SOFT_SKILLS: SkillEntry[] = [
  { canonical: 'Leadership', synonyms: ['team leadership', 'tech lead', 'leading teams'], category: 'Soft Skills', industries: ['software-engineering', 'data-science', 'devops', 'finance', 'healthcare', 'cybersecurity', 'mobile-development', 'game-development'] },
  { canonical: 'Communication', synonyms: ['written communication', 'verbal communication', 'technical communication'], category: 'Soft Skills', industries: ['software-engineering', 'data-science', 'devops', 'finance', 'healthcare', 'cybersecurity', 'mobile-development', 'game-development'] },
  { canonical: 'Problem Solving', synonyms: ['problem-solving', 'analytical thinking', 'critical thinking'], category: 'Soft Skills', industries: ['software-engineering', 'data-science', 'devops', 'finance', 'healthcare', 'cybersecurity', 'mobile-development', 'game-development'] },
  { canonical: 'Agile', synonyms: ['agile methodology', 'agile development', 'scrum', 'kanban'], category: 'Soft Skills', industries: ['software-engineering', 'devops', 'mobile-development'] },
  { canonical: 'Project Management', synonyms: ['PM', 'project planning', 'project delivery'], category: 'Soft Skills', industries: ['software-engineering', 'data-science', 'devops', 'finance', 'healthcare', 'cybersecurity', 'mobile-development', 'game-development'] },
  { canonical: 'Teamwork', synonyms: ['collaboration', 'team player', 'cross-functional collaboration'], category: 'Soft Skills', industries: ['software-engineering', 'data-science', 'devops', 'finance', 'healthcare', 'cybersecurity', 'mobile-development', 'game-development'] },
  { canonical: 'Mentoring', synonyms: ['coaching', 'mentorship', 'knowledge sharing'], category: 'Soft Skills', industries: ['software-engineering', 'data-science', 'devops', 'finance', 'healthcare', 'cybersecurity', 'mobile-development', 'game-development'] },
  { canonical: 'Time Management', synonyms: ['time-management', 'deadline management', 'prioritization'], category: 'Soft Skills', industries: ['software-engineering', 'data-science', 'devops', 'finance', 'healthcare', 'cybersecurity', 'mobile-development', 'game-development'] },
  { canonical: 'Technical Writing', synonyms: ['tech writing', 'documentation', 'technical documentation'], category: 'Soft Skills', industries: ['software-engineering', 'cybersecurity'] },
  { canonical: 'Public Speaking', synonyms: ['presentations', 'conference talks', 'tech talks'], category: 'Soft Skills', industries: ['software-engineering', 'data-science'] },
];

// ─── Other (Finance, Healthcare, Game-Dev specific) ──────────────────────────

const OTHER: SkillEntry[] = [
  { canonical: 'Blockchain', synonyms: ['distributed ledger', 'blockchain technology', 'DLT'], category: 'Other', industries: ['finance', 'software-engineering'] },
  { canonical: 'Smart Contracts', synonyms: ['solidity', 'smart contract development'], category: 'Other', industries: ['finance', 'software-engineering'] },
  { canonical: 'Quantitative Analysis', synonyms: ['quant', 'quantitative finance', 'quant analysis'], category: 'Other', industries: ['finance'] },
  { canonical: 'Risk Management', synonyms: ['risk analysis', 'financial risk'], category: 'Other', industries: ['finance'] },
  { canonical: 'Financial Modeling', synonyms: ['financial models', 'fin modeling'], category: 'Other', industries: ['finance'] },
  { canonical: 'HL7', synonyms: ['hl7 fhir', 'health level 7', 'HL7 FHIR'], category: 'Other', industries: ['healthcare'] },
  { canonical: 'DICOM', synonyms: ['dicom imaging', 'medical imaging'], category: 'Other', industries: ['healthcare'] },
  { canonical: 'Electronic Health Records', synonyms: ['EHR', 'ehr', 'EMR', 'electronic medical records'], category: 'Other', industries: ['healthcare'] },
  { canonical: 'Clinical Data', synonyms: ['clinical informatics', 'clinical data management'], category: 'Other', industries: ['healthcare'] },
  { canonical: 'Bioinformatics', synonyms: ['computational biology', 'genomics'], category: 'Other', industries: ['healthcare', 'data-science'] },
  { canonical: 'Game Physics', synonyms: ['physics engine', 'physics simulation'], category: 'Other', industries: ['game-development'] },
  { canonical: '3D Modeling', synonyms: ['3d modeling', 'blender', 'maya', '3d art'], category: 'Other', industries: ['game-development'] },
  { canonical: 'Shader Programming', synonyms: ['HLSL', 'GLSL', 'shader development'], category: 'Other', industries: ['game-development'] },
  { canonical: 'Game AI', synonyms: ['game artificial intelligence', 'npc ai', 'pathfinding'], category: 'Other', industries: ['game-development'] },
  { canonical: 'Multiplayer Networking', synonyms: ['netcode', 'game networking', 'multiplayer systems'], category: 'Other', industries: ['game-development'] },
  { canonical: 'RESTful APIs', synonyms: ['REST', 'rest api', 'REST API', 'restful'], category: 'Other', industries: ['software-engineering', 'mobile-development'] },
  { canonical: 'GraphQL', synonyms: ['graphql api', 'gql'], category: 'Other', industries: ['software-engineering', 'mobile-development'] },
  { canonical: 'Microservices', synonyms: ['microservices architecture', 'micro services'], category: 'Other', industries: ['software-engineering', 'devops'] },
  { canonical: 'WebSocket', synonyms: ['websockets', 'ws', 'real-time communication'], category: 'Other', industries: ['software-engineering', 'game-development'] },
  { canonical: 'gRPC', synonyms: ['grpc', 'google rpc'], category: 'Other', industries: ['software-engineering', 'devops'] },
  { canonical: 'CI/CD', synonyms: ['cicd', 'ci cd', 'continuous integration', 'continuous delivery', 'continuous deployment'], category: 'Other', industries: ['software-engineering', 'devops'] },
  { canonical: 'Linux', synonyms: ['linux administration', 'unix', 'ubuntu', 'centos', 'rhel'], category: 'Other', industries: ['software-engineering', 'devops', 'cybersecurity'] },
  { canonical: 'API Design', synonyms: ['api architecture', 'api development'], category: 'Other', industries: ['software-engineering'] },
  { canonical: 'System Design', synonyms: ['system architecture', 'distributed systems', 'scalable systems'], category: 'Other', industries: ['software-engineering', 'devops'] },
  { canonical: 'Event-Driven Architecture', synonyms: ['event driven', 'EDA', 'event sourcing'], category: 'Other', industries: ['software-engineering', 'finance'] },
];

// ─── Combined Taxonomy ───────────────────────────────────────────────────────

export const SKILLS_TAXONOMY: SkillEntry[] = [
  ...PROGRAMMING_LANGUAGES,
  ...FRAMEWORKS,
  ...CLOUD_PLATFORMS,
  ...DATABASES,
  ...DEVOPS,
  ...DATA_SCIENCE,
  ...DESIGN,
  ...TESTING,
  ...SECURITY,
  ...MOBILE,
  ...SOFT_SKILLS,
  ...OTHER,
];

// ─── Pre-built Lookup Map (O(1) access) ─────────────────────────────────────

const LOOKUP_MAP = new Map<string, SkillEntry>();

for (const entry of SKILLS_TAXONOMY) {
  LOOKUP_MAP.set(entry.canonical.toLowerCase(), entry);
  for (const synonym of entry.synonyms) {
    LOOKUP_MAP.set(synonym.toLowerCase(), entry);
  }
}

// ─── Exported Functions ──────────────────────────────────────────────────────

/**
 * Lookup a skill by any name (canonical or synonym). O(1) via pre-built Map.
 * Case-insensitive matching.
 */
export function lookupSkill(name: string): SkillEntry | null {
  return LOOKUP_MAP.get(name.toLowerCase()) ?? null;
}

/**
 * Resolve a name to its canonical form. Returns original if not found.
 * Case-insensitive matching.
 */
export function canonicalize(name: string): string {
  const entry = lookupSkill(name);
  return entry ? entry.canonical : name;
}

/**
 * Check if two skill names are synonyms of each other.
 * Returns true if both names resolve to the same canonical entry.
 */
export function areSynonyms(nameA: string, nameB: string): boolean {
  const entryA = lookupSkill(nameA);
  const entryB = lookupSkill(nameB);
  if (!entryA || !entryB) return false;
  return entryA.canonical === entryB.canonical;
}

/**
 * Get all skills in a given category.
 */
export function getByCategory(category: SkillCategory): SkillEntry[] {
  return SKILLS_TAXONOMY.filter((entry) => entry.category === category);
}

/**
 * Get the total number of skill entries in the taxonomy.
 */
export function getTaxonomySize(): number {
  return SKILLS_TAXONOMY.length;
}
