import { ATSBreakdownInput } from "@/lib/atsScoring";

const STOPWORDS = new Set([
  "and",
  "the",
  "for",
  "with",
  "from",
  "that",
  "this",
  "your",
  "role",
  "resume",
  "experience",
  "skills",
  "work",
  "using"
]);

const ROLE_KEYWORD_HINTS: Array<{ match: RegExp; keywords: string[] }> = [
  {
    match: /frontend/i,
    keywords: ["react", "javascript", "typescript", "css", "html", "next.js", "redux", "ui", "accessibility"]
  },
  {
    match: /backend/i,
    keywords: ["node", "api", "microservices", "database", "sql", "rest", "graphql", "authentication", "docker"]
  },
  {
    match: /full\s*stack/i,
    keywords: ["react", "node", "typescript", "api", "database", "cloud", "testing", "architecture"]
  },
  {
    match: /data\s*analyst/i,
    keywords: ["sql", "excel", "tableau", "power bi", "dashboard", "analytics", "reporting", "visualization"]
  },
  {
    match: /data\s*scientist/i,
    keywords: ["python", "machine learning", "statistics", "pandas", "numpy", "model", "experimentation"]
  },
  {
    match: /devops/i,
    keywords: ["aws", "ci/cd", "docker", "kubernetes", "terraform", "linux", "monitoring", "automation"]
  },
  {
    match: /product\s*manager/i,
    keywords: ["roadmap", "prioritization", "stakeholder", "metrics", "user research", "launch", "agile"]
  },
  {
    match: /ui\/?ux|designer/i,
    keywords: ["figma", "wireframes", "prototype", "design system", "usability", "interaction", "research"]
  },
  {
    match: /qa|quality/i,
    keywords: ["testing", "automation", "selenium", "cypress", "test cases", "regression", "defect", "qa"]
  },
  {
    match: /mobile/i,
    keywords: ["android", "ios", "react native", "flutter", "swift", "kotlin", "mobile app", "app store"]
  }
];

function clampScore(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function toNormalizedNumber(value: unknown, fallback = 0) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return clampScore(numeric);
}

function tokenize(value: string) {
  return Array.from(
    new Set(
      value
        .toLowerCase()
        .split(/[^a-z0-9+#.]+/i)
        .map((entry) => entry.trim())
        .filter((entry) => entry.length >= 3 && !STOPWORDS.has(entry))
    )
  );
}

function getRoleKeywords(jobRole: string) {
  const roleTokens = tokenize(jobRole);
  const hinted = ROLE_KEYWORD_HINTS.filter((entry) => entry.match.test(jobRole))
    .flatMap((entry) => entry.keywords)
    .map((keyword) => keyword.toLowerCase());

  const keywords = Array.from(new Set([...roleTokens, ...hinted]));
  return keywords.slice(0, 24);
}

function blendScore(aiScore: number, signalScore: number, aiWeight: number) {
  return clampScore(aiScore * aiWeight + signalScore * (1 - aiWeight));
}

function uniqueStrings(values: string[], max: number) {
  return Array.from(new Set(values.map((entry) => entry.trim()).filter(Boolean))).slice(0, max);
}

function computeRoleSignals(resumeText: string, jobRole: string) {
  const resumeLower = resumeText.toLowerCase();
  const roleKeywords = getRoleKeywords(jobRole);
  const matchedKeywords = roleKeywords.filter((keyword) => resumeLower.includes(keyword));
  const missingKeywords = roleKeywords.filter((keyword) => !resumeLower.includes(keyword));

  const metricHits = (resumeText.match(/\b\d+(?:\.\d+)?%?\b/g) || []).length;
  const actionVerbHits =
    (resumeText.match(
      /\b(led|built|developed|improved|designed|optimized|implemented|managed|launched|automated|delivered)\b/gi
    ) || []).length;
  const hasSkillsSection = /\b(skills|tools|technologies|stack|languages)\b/i.test(resumeText);
  const hasExperienceSection = /\b(experience|employment|projects|achievements|responsibilities)\b/i.test(resumeText);

  const keywordSignal = clampScore((matchedKeywords.length / Math.max(roleKeywords.length, 1)) * 100);
  const skillSignal = clampScore(
    keywordSignal * 0.7 + (hasSkillsSection ? 15 : 0) + Math.min(matchedKeywords.length * 2, 15)
  );
  const experienceSignal = clampScore(
    30 + (hasExperienceSection ? 20 : 0) + Math.min(actionVerbHits * 2, 25) + Math.min(metricHits * 3, 25)
  );

  return {
    keywordSignal,
    skillSignal,
    experienceSignal,
    matchedKeywords: uniqueStrings(matchedKeywords, 20),
    missingSkills: uniqueStrings(missingKeywords, 15)
  };
}

type CalibrateInput = {
  resumeText: string;
  jobRole: string;
  aiBreakdown: Record<string, unknown>;
  baselineFormattingScore: number;
};

export function calibrateBreakdownWithRole(input: CalibrateInput): {
  breakdown: ATSBreakdownInput;
  matchedKeywords: string[];
  missingSkills: string[];
} {
  const signals = computeRoleSignals(input.resumeText, input.jobRole);
  const aiKeyword = toNormalizedNumber(input.aiBreakdown.keywordMatch, signals.keywordSignal);
  const aiSkill = toNormalizedNumber(input.aiBreakdown.skillMatch, signals.skillSignal);
  const aiFormatting = toNormalizedNumber(input.aiBreakdown.formattingScore, input.baselineFormattingScore);
  const aiExperience = toNormalizedNumber(input.aiBreakdown.experienceScore, signals.experienceSignal);
  const aiEducation = toNormalizedNumber(input.aiBreakdown.educationScore, 55);

  return {
    breakdown: {
      keywordMatch: blendScore(aiKeyword, signals.keywordSignal, 0.65),
      skillMatch: blendScore(aiSkill, signals.skillSignal, 0.65),
      formattingScore: blendScore(aiFormatting, clampScore(input.baselineFormattingScore), 0.75),
      experienceScore: blendScore(aiExperience, signals.experienceSignal, 0.7),
      educationScore: aiEducation
    },
    matchedKeywords: signals.matchedKeywords,
    missingSkills: signals.missingSkills
  };
}
