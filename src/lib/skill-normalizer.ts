/**
 * Skill Normalizer & Requirement Extractor for Aganyu
 * Cleans long, multi-sentence requirement text (typical in Malawi job postings)
 * into canonical skill tags and quantitative metrics.
 */

// ─────────────────────────────────────────────────────────────────
// Non-Skill Blocklist — fragments that must never become skills
// ─────────────────────────────────────────────────────────────────
const NON_SKILL_BLOCKLIST: RegExp[] = [
    // Locations / geography
    /\b(lilongwe|blantyre|mzuzu|zomba|malawi|mangochi|kasungu|salima|karonga|africa|southern africa)\b/i,
    // Date patterns
    /\d{1,2}\s*(january|february|march|april|may|june|july|august|september|october|november|december)/i,
    /\b\d{4}\b/,          // standalone year
    /\b\d{1,2}\/\d{1,2}/, // date slash format
    // URLs / emails
    /https?:\/\//,
    /@[a-z0-9.-]+\.[a-z]{2,}/i,
    // Common application boilerplate
    /\b(apply|application|submit|send|email|cv|resume|cover letter|curriculum vitae|closing date|deadline|shortlisted|interviewed|only|candidates|qualified)\b/i,
    /\b(to apply|how to apply|please note|note that|further information|for more|only shortlisted)\b/i,
    // Generic noise
    /^(the|a|an|and|or|in|of|for|to|at|by|with|is|are|be|was|were|has|have|had|will|shall|should|would|may|can|could|must|that|this|these|those|which|who|whom|whose|where|when|why|how)$/i,
    /^\d+$/, // pure number
];

// ─────────────────────────────────────────────────────────────────
// Canonical Skill Synonyms — maps raw text patterns → canonical tag
// ─────────────────────────────────────────────────────────────────
const KNOWN_CANONICAL_SYNONYMS: Record<string, string> = {
    // ── Accounting & Finance ─────────────────────────────────────
    'registered member of icam': 'ICAM Membership',
    'icam member': 'ICAM Membership',
    'icam': 'ICAM Membership',
    'chartered accountant': 'Chartered Accountancy',
    'cpa': 'CPA Certification',
    'acca': 'ACCA Certification',
    'cima': 'CIMA Certification',
    'public financial management': 'Public Financial Management',
    'pfm': 'Public Financial Management',
    'public institution': 'Public Sector Experience',
    'public sector': 'Public Sector Experience',
    'statutory body': 'Public Sector Experience',
    'financial statements': 'Financial Reporting',
    'financial reporting': 'Financial Reporting',
    'financial analysis': 'Financial Analysis',
    'financial management': 'Financial Management',
    'financial planning': 'Financial Planning',
    'financial modeling': 'Financial Modelling',
    'financial modelling': 'Financial Modelling',
    'external audits': 'External Auditing',
    'external auditing': 'External Auditing',
    'internal audit': 'Internal Auditing',
    'internal controls': 'Internal Controls',
    'internal control': 'Internal Controls',
    'budgeting': 'Budgeting & Planning',
    'annual budgets': 'Budgeting & Planning',
    'budget preparation': 'Budgeting & Planning',
    'cash flow': 'Cash Flow Management',
    'tax compliance': 'Tax Compliance',
    'taxation': 'Taxation',
    'payroll': 'Payroll Management',
    'accounts payable': 'Accounts Payable',
    'accounts receivable': 'Accounts Receivable',
    'bank reconciliation': 'Bank Reconciliation',
    'bookkeeping': 'Bookkeeping',
    'cost accounting': 'Cost Accounting',
    'management accounting': 'Management Accounting',
    'donor reporting': 'Donor Reporting',
    'grant management': 'Grant Management',
    'procurement': 'Procurement',
    'supply chain': 'Supply Chain Management',
    'logistics': 'Logistics',
    'inventory management': 'Inventory Management',
    'assets management': 'Asset Management',
    'asset management': 'Asset Management',
    'erp': 'ERP Systems',
    'sage': 'Sage Accounting',
    'pastel': 'Pastel Accounting',
    'quickbooks': 'QuickBooks',
    'sun systems': 'SUN Systems',
    'microsoft dynamics': 'Microsoft Dynamics',
    'navision': 'Microsoft Dynamics NAV',

    // ── Information Technology ────────────────────────────────────
    'software development': 'Software Development',
    'web development': 'Web Development',
    'mobile development': 'Mobile Development',
    'application development': 'Application Development',
    'system administration': 'System Administration',
    'network administration': 'Network Administration',
    'database administration': 'Database Administration',
    'database management': 'Database Management',
    'sql': 'SQL',
    'mysql': 'MySQL',
    'postgresql': 'PostgreSQL',
    'oracle database': 'Oracle Database',
    'mongodb': 'MongoDB',
    'javascript': 'JavaScript',
    'typescript': 'TypeScript',
    'python': 'Python',
    'java': 'Java',
    'php': 'PHP',
    'c#': 'C#',
    '.net': '.NET',
    'node.js': 'Node.js',
    'nodejs': 'Node.js',
    'react': 'React',
    'angular': 'Angular',
    'vue': 'Vue.js',
    'html': 'HTML/CSS',
    'css': 'HTML/CSS',
    'html/css': 'HTML/CSS',
    'rest api': 'REST API Development',
    'api development': 'API Development',
    'cloud computing': 'Cloud Computing',
    'aws': 'AWS',
    'azure': 'Microsoft Azure',
    'google cloud': 'Google Cloud Platform',
    'linux': 'Linux',
    'windows server': 'Windows Server',
    'networking': 'Networking',
    'cybersecurity': 'Cybersecurity',
    'information security': 'Information Security',
    'data analysis': 'Data Analysis',
    'data analytics': 'Data Analytics',
    'data science': 'Data Science',
    'machine learning': 'Machine Learning',
    'artificial intelligence': 'Artificial Intelligence',
    'power bi': 'Power BI',
    'tableau': 'Tableau',
    'excel': 'Microsoft Excel',
    'microsoft excel': 'Microsoft Excel',
    'microsoft office': 'Microsoft Office Suite',
    'ms office': 'Microsoft Office Suite',
    'gis': 'GIS',
    'geographic information': 'GIS',
    'arcgis': 'ArcGIS',
    'helpdesk': 'IT Helpdesk Support',
    'technical support': 'Technical Support',
    'troubleshooting': 'IT Troubleshooting',
    'hardware maintenance': 'Hardware Maintenance',
    'erp implementation': 'ERP Implementation',
    'it infrastructure': 'IT Infrastructure',
    'project management': 'Project Management',
    'agile': 'Agile Methodology',
    'scrum': 'Scrum',
    'devops': 'DevOps',
    'git': 'Git Version Control',
    'version control': 'Git Version Control',

    // ── Healthcare & Medical ──────────────────────────────────────
    'clinical experience': 'Clinical Experience',
    'patient care': 'Patient Care',
    'nursing': 'Nursing',
    'midwifery': 'Midwifery',
    'pharmacy': 'Pharmacy',
    'pharmacist': 'Pharmaceutical Skills',
    'medical records': 'Medical Records Management',
    'public health': 'Public Health',
    'epidemiology': 'Epidemiology',
    'health information': 'Health Information Management',
    'laboratory': 'Laboratory Skills',
    'medical laboratory': 'Medical Laboratory',
    'radiology': 'Radiology',
    'surgery': 'Surgical Skills',
    'anesthesia': 'Anaesthesia',
    'infection prevention': 'Infection Prevention & Control',
    'ipc': 'Infection Prevention & Control',
    'hiv': 'HIV/AIDS Programming',
    'malaria': 'Malaria Control',
    'nutrition': 'Nutrition',
    'maternal health': 'Maternal & Child Health',
    'reproductive health': 'Reproductive Health',
    'counselling': 'Counselling',
    'community health': 'Community Health',
    'environmental health': 'Environmental Health',
    'disease surveillance': 'Disease Surveillance',
    'health promotion': 'Health Promotion',
    'first aid': 'First Aid',
    'basic life support': 'Basic Life Support',

    // ── NGO / Development ─────────────────────────────────────────
    'monitoring and evaluation': 'Monitoring & Evaluation',
    'monitoring & evaluation': 'Monitoring & Evaluation',
    'm&e': 'Monitoring & Evaluation',
    'meal': 'MEAL',
    'results-based management': 'Results-Based Management',
    'logical framework': 'Logical Framework (Logframe)',
    'logframe': 'Logical Framework (Logframe)',
    'project planning': 'Project Planning',
    'project implementation': 'Project Implementation',
    'proposal writing': 'Proposal Writing',
    'report writing': 'Report Writing',
    'stakeholder engagement': 'Stakeholder Engagement',
    'community mobilization': 'Community Mobilization',
    'community engagement': 'Community Engagement',
    'capacity building': 'Capacity Building',
    'advocacy': 'Advocacy',
    'gender mainstreaming': 'Gender Mainstreaming',
    'safeguarding': 'Safeguarding',
    'child protection': 'Child Protection',
    'food security': 'Food Security',
    'wash': 'WASH',
    'water sanitation': 'WASH',
    'humanitarian': 'Humanitarian Response',
    'disaster risk': 'Disaster Risk Reduction',
    'climate change': 'Climate Change Adaptation',
    'livelihoods': 'Livelihoods Programming',
    'data collection': 'Data Collection',
    'kobo': 'KoBoToolbox',
    'kobotoolbox': 'KoBoToolbox',
    'odk': 'ODK Data Collection',
    'stata': 'STATA',
    'spss': 'SPSS',
    'nvivo': 'NVivo',
    'qualitative research': 'Qualitative Research',
    'quantitative research': 'Quantitative Research',
    'research methods': 'Research Methods',

    // ── Education ─────────────────────────────────────────────────
    'curriculum development': 'Curriculum Development',
    'lesson planning': 'Lesson Planning',
    'classroom management': 'Classroom Management',
    'teaching': 'Teaching',
    'training facilitation': 'Training Facilitation',
    'training delivery': 'Training Delivery',
    'adult learning': 'Adult Learning',
    'e-learning': 'E-Learning',
    'instructional design': 'Instructional Design',
    'assessment': 'Assessment & Evaluation',
    'student counselling': 'Student Counselling',

    // ── Engineering ───────────────────────────────────────────────
    'civil engineering': 'Civil Engineering',
    'structural engineering': 'Structural Engineering',
    'mechanical engineering': 'Mechanical Engineering',
    'electrical engineering': 'Electrical Engineering',
    'autocad': 'AutoCAD',
    'cad': 'CAD Design',
    'construction management': 'Construction Management',
    'site supervision': 'Site Supervision',
    'environmental impact': 'Environmental Impact Assessment',
    'eia': 'Environmental Impact Assessment',
    'water resources': 'Water Resources Management',
    'irrigation': 'Irrigation',
    'renewable energy': 'Renewable Energy',
    'solar': 'Solar Energy',
    'quality control': 'Quality Control',
    'quality assurance': 'Quality Assurance',

    // ── Agriculture ───────────────────────────────────────────────
    'agronomy': 'Agronomy',
    'crop production': 'Crop Production',
    'livestock': 'Livestock Management',
    'animal husbandry': 'Animal Husbandry',
    'agricultural extension': 'Agricultural Extension',
    'value chain': 'Value Chain Development',
    'soil science': 'Soil Science',
    'irrigation management': 'Irrigation Management',
    'agroforestry': 'Agroforestry',

    // ── Management & Leadership ───────────────────────────────────
    'strategic planning': 'Strategic Planning',
    'change management': 'Change Management',
    'team leadership': 'Team Leadership',
    'people management': 'People Management',
    'performance management': 'Performance Management',
    'human resources': 'Human Resources Management',
    'hr management': 'Human Resources Management',
    'talent management': 'Talent Management',
    'recruitment': 'Recruitment & Selection',
    'staff development': 'Staff Development',
    'organisational development': 'Organisational Development',
    'organizational development': 'Organisational Development',
    'risk management': 'Risk Management',
    'compliance': 'Compliance Management',
    'governance': 'Governance',
    'policy development': 'Policy Development',
    'communication skills': 'Communication Skills',
    'written communication': 'Written Communication',
    'oral communication': 'Oral Communication',
    'presentation skills': 'Presentation Skills',
    'negotiation': 'Negotiation',
    'analytical skills': 'Analytical Skills',
    'problem solving': 'Problem Solving',
    'critical thinking': 'Critical Thinking',
    'decision making': 'Decision Making',
    'time management': 'Time Management',
    'attention to detail': 'Attention to Detail',
    'interpersonal skills': 'Interpersonal Skills',
    'customer service': 'Customer Service',
    'client relations': 'Client Relations Management',
    'sales': 'Sales',
    'marketing': 'Marketing',
    'digital marketing': 'Digital Marketing',
    'social media': 'Social Media Management',
    'brand management': 'Brand Management',
    'business development': 'Business Development',
    'market research': 'Market Research',

    // ── Languages ─────────────────────────────────────────────────
    'english proficiency': 'English Proficiency',
    'proficiency in english': 'English Proficiency',
    'written english': 'English Proficiency',
    'chichewa': 'Chichewa',
    'tumbuka': 'Tumbuka',
    'french': 'French',
    'portuguese': 'Portuguese',
    'swahili': 'Swahili',

    // ── Driving / Field ───────────────────────────────────────────
    'valid driving licence': 'Valid Driving Licence',
    'driving licence': 'Valid Driving Licence',
    'clean driving': 'Valid Driving Licence',
    'field work': 'Field Work',
    'willingness to travel': 'Willingness to Travel',
};

// ─────────────────────────────────────────────────────────────────
// normalizeSkills — Main export
// ─────────────────────────────────────────────────────────────────

/**
 * Normalizes a list or raw block of skill strings into clean canonical tags.
 * Accepts either an array of strings or a raw text block (skills section only).
 */
export function normalizeSkills(rawInput: string | string[]): string[] {
    if (!rawInput) return [];

    const rawText = Array.isArray(rawInput) ? rawInput.join('\n') : rawInput;

    // Split on common delimiters used in Malawian job postings
    const fragments = rawText
        .split(/[;\n•\-–—▪▸►◆●○✓✔]+|\b(?:must have|should have|required|essential|ability to|able to|knowledge of|experience in|experience with|familiarity with|proficiency in|proven experience|demonstrated experience)\b/i)
        .map(s => s.trim())
        .filter(s => s.length >= 3 && s.length <= 80);  // hard length bounds

    const normalizedSet = new Set<string>();

    for (const fragment of fragments) {
        const lower = fragment.toLowerCase();

        // ── Blocklist check ───────────────────────────────────────
        if (isBlocklisted(lower, fragment)) continue;

        // ── Word count guard: reject full sentences ───────────────
        const wordCount = fragment.split(/\s+/).length;
        if (wordCount > 8) continue;

        // ── Canonical synonym match ───────────────────────────────
        let matchedCanonical = false;
        for (const [pattern, canonical] of Object.entries(KNOWN_CANONICAL_SYNONYMS)) {
            if (lower.includes(pattern)) {
                normalizedSet.add(canonical);
                matchedCanonical = true;
                // don't break — one fragment can match multiple (e.g. "internal audit and financial reporting")
            }
        }

        // ── Fallback: add cleaned fragment if it looks like a skill ─
        if (!matchedCanonical) {
            const clean = fragment
                .replace(/^[^a-zA-Z0-9]+/, '')   // strip leading punctuation
                .replace(/[^a-zA-Z0-9\s\/&#.+\-()]/g, '') // strip noise chars
                .trim();

            if (clean.length >= 3 && clean.length <= 60 && looksLikeSkill(clean)) {
                normalizedSet.add(clean.charAt(0).toUpperCase() + clean.slice(1));
            }
        }
    }

    return Array.from(normalizedSet);
}

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

function isBlocklisted(lower: string, original: string): boolean {
    for (const pattern of NON_SKILL_BLOCKLIST) {
        if (pattern.test(lower) || pattern.test(original)) return true;
    }
    return false;
}

/**
 * Heuristic: a string "looks like a skill" if it's not pure boilerplate.
 * Rejects strings that are only stopwords or common filler phrases.
 */
function looksLikeSkill(text: string): boolean {
    const lower = text.toLowerCase();

    // Must contain at least one meaningful word (not just articles/prepositions)
    const stopOnly = /^(the|a|an|and|or|in|of|for|to|at|by|with|is|are|be|on|up|as)(\s+(the|a|an|and|or|in|of|for|to|at|by|with|is|are|be|on|up|as))*$/i.test(lower);
    if (stopOnly) return false;

    // Reject if it starts with a verb suggesting it's a sentence
    if (/^(ensure|maintain|provide|support|develop|manage|coordinate|prepare|conduct|implement|assist|report|work|liaise|collaborate|communicate|facilitate|monitor|evaluate|review|establish|identify|undertake|perform|demonstrate|show|display)\b/i.test(lower)) return false;

    return true;
}

// ─────────────────────────────────────────────────────────────────
// extractMinimumExperienceYears — unchanged
// ─────────────────────────────────────────────────────────────────

/**
 * Extracts minimum years of experience from raw requirement text.
 */
export function extractMinimumExperienceYears(text: string): number | null {
    if (!text) return null;

    const regex = /(\b\d{1,2}\b|\b(?:one|two|three|four|five|six|seven|eight|nine|ten)\b)\s*(?:\(\d{1,2}\)\s*)?(?:\+|-|\s)*years?/i;
    const match = text.match(regex);

    if (!match) return null;

    const word = match[1].toLowerCase();
    const wordMap: Record<string, number> = {
        one: 1, two: 2, three: 3, four: 4, five: 5,
        six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    };

    if (wordMap[word] !== undefined) return wordMap[word];

    const num = parseInt(word, 10);
    return isNaN(num) ? null : num;
}
