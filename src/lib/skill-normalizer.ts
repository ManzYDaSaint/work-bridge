/**
 * Skill Normalizer & Requirement Extractor for Aganyu
 * Cleans long, multi-sentence requirement text (typical in Malawi job postings)
 * into canonical skill tags and quantitative metrics.
 */

const KNOWN_CANONICAL_SYNONYMS: Record<string, string> = {
  'registered member of icam': 'ICAM Member',
  'icam member': 'ICAM Member',
  'icam': 'ICAM Member',
  'chartered accountant': 'ICAM Member',
  'public financial management': 'Public Financial Management',
  'pfm': 'Public Financial Management',
  'public institution': 'Public Sector Experience',
  'public sector': 'Public Sector Experience',
  'statutory body': 'Public Sector Experience',
  'government': 'Public Sector Experience',
  'financial statements': 'Financial Reporting',
  'financial reporting': 'Financial Reporting',
  'external audits': 'External Auditing',
  'auditing': 'External Auditing',
  'internal controls': 'Internal Controls',
  'budgeting': 'Budgeting & Planning',
  'annual budgets': 'Budgeting & Planning',
};

/**
 * Normalizes a list or raw block of skill strings into clean canonical tags.
 */
export function normalizeSkills(rawInput: string | string[]): string[] {
  if (!rawInput) return [];

  const rawText = Array.isArray(rawInput) ? rawInput.join('; ') : rawInput;

  // Split on semicolons, bullet points, commas, and newlines
  const fragments = rawText
    .split(/;|\n|•|\b(?:must have|should have|required|essential)\b/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);

  const normalizedSet = new Set<string>();

  for (const fragment of fragments) {
    const lower = fragment.toLowerCase();

    let matchedCanonical = false;
    for (const [pattern, canonical] of Object.entries(KNOWN_CANONICAL_SYNONYMS)) {
      if (lower.includes(pattern)) {
        normalizedSet.add(canonical);
        matchedCanonical = true;
      }
    }

    if (!matchedCanonical && fragment.length < 50) {
      // Clean leading bullet symbols or punctuation
      const clean = fragment.replace(/^[^a-zA-Z0-9]+/, '').trim();
      if (clean.length > 2) {
        normalizedSet.add(clean.charAt(0).toUpperCase() + clean.slice(1));
      }
    }
  }

  return Array.from(normalizedSet);
}

/**
 * Extracts minimum years of experience from raw requirement text if not explicitly set.
 */
export function extractMinimumExperienceYears(text: string): number | null {
  if (!text) return null;

  // Match patterns like "7 years", "seven (7) years", "5+ years"
  const regex = /(\b\d{1,2}\b|\b(?:one|two|three|four|five|six|seven|eight|nine|ten)\b)\s*(?:\(\d{1,2}\)\s*)?(?:\+|-|\s)*years?/i;
  const match = text.match(regex);

  if (!match) return null;

  const word = match[1].toLowerCase();
  const wordMap: Record<string, number> = {
    one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10
  };

  if (wordMap[word] !== undefined) {
    return wordMap[word];
  }

  const num = parseInt(word, 10);
  return isNaN(num) ? null : num;
}
