import OpenAI from "openai";

import { aiAnalysisSchema } from "@/lib/atsScoring";
import { generateGeminiText } from "@/lib/gemini-client";
import { AnalysisSource } from "@/types";

let client: OpenAI | null = null;
const ANALYSIS_PROMPT =
  "You are an ATS evaluator. Return strict JSON with: breakdown(keywordMatch,skillMatch,formattingScore,experienceScore,educationScore), missingSkills[], matchedKeywords[], suggestions[], sectionFeedback(summary,experience,skills,education,formatting). Keep scores 0-100.";

type AnalyzeInput = {
  resumeText: string;
  jobRole: string;
  formattingScore: number;
};

type ParsedAnalysis = {
  breakdown?: Record<string, unknown>;
  missingSkills?: unknown;
  matchedKeywords?: unknown;
  suggestions?: unknown;
  sectionFeedback?: Record<string, unknown>;
};

const STOPWORDS = new Set([
  "and",
  "the",
  "for",
  "with",
  "from",
  "that",
  "this",
  "your",
  "you",
  "are",
  "was",
  "were",
  "have",
  "has",
  "had",
  "job",
  "role",
  "resume",
  "experience",
  "skills",
  "education",
  "work",
  "using",
  "into",
  "over",
  "under",
  "through"
]);

type Provider = "gemini" | "openai";
type AnalysisOutput = ReturnType<typeof aiAnalysisSchema.parse> & { source: AnalysisSource };

function getProviderOrder() {
  const configured = String(process.env.AI_PROVIDER_ORDER || "gemini,openai")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  const providers: Provider[] = [];

  for (const entry of configured) {
    if ((entry === "gemini" || entry === "openai") && !providers.includes(entry)) {
      providers.push(entry);
    }
  }

  if (!providers.length) {
    return ["gemini", "openai"] as Provider[];
  }

  return providers;
}

function getOpenAIClient() {
  if (client) {
    return client;
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  client = new OpenAI({ apiKey });
  return client;
}

function extractJsonPayload(raw: string) {
  const trimmed = raw.trim();

  if (trimmed.startsWith("{")) {
    return trimmed;
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

function clampScore(value: unknown, fallback = 0) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return Math.max(0, Math.min(100, fallback));
  }
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function normalizeStringArray(value: unknown, max: number) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  const unique = new Set<string>();

  for (const item of value) {
    const normalized = String(item || "").trim();
    if (!normalized) continue;
    unique.add(normalized);
    if (unique.size >= max) break;
  }

  return Array.from(unique);
}

function toStringValue(value: unknown, fallback: string) {
  const normalized = String(value || "").trim();
  return normalized || fallback;
}

function tokenizeKeywords(value: string) {
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

function analyzeWithHeuristics(input: AnalyzeInput): ParsedAnalysis {
  const resumeText = input.resumeText || "";
  const resumeLower = resumeText.toLowerCase();
  const roleKeywords = tokenizeKeywords(input.jobRole).slice(0, 20);

  const matchedRoleKeywords = roleKeywords.filter((keyword) => resumeLower.includes(keyword));
  const missingRoleKeywords = roleKeywords.filter((keyword) => !resumeLower.includes(keyword));

  const metricHits = (resumeText.match(/\b\d+(?:\.\d+)?%?\b/g) || []).length;
  const hasEducationSection =
    /\b(education|bachelor|master|phd|university|college|certification|degree)\b/i.test(resumeText);
  const hasExperienceSection = /\b(experience|employment|projects|responsibilities|achieved)\b/i.test(resumeText);
  const hasSkillsSection = /\b(skills|tools|technologies|stack|languages)\b/i.test(resumeText);

  const keywordMatch = clampScore((matchedRoleKeywords.length / Math.max(roleKeywords.length, 1)) * 100, 45);
  const skillMatch = clampScore(
    ((matchedRoleKeywords.length + Number(hasSkillsSection)) / Math.max(roleKeywords.length, 1)) * 100,
    42
  );
  const experienceScore = clampScore((Number(hasExperienceSection) * 55) + Math.min(metricHits * 4, 35), 50);
  const educationScore = clampScore(hasEducationSection ? 78 : 48, 48);

  const suggestions = [
    "Add measurable impact metrics to at least 3 recent experience bullets.",
    "Mirror top target-role keywords naturally in summary and skills sections.",
    "Use stronger action verbs and concise bullet structure for ATS scanability."
  ];

  return {
    breakdown: {
      keywordMatch,
      skillMatch,
      formattingScore: input.formattingScore,
      experienceScore,
      educationScore
    },
    missingSkills: missingRoleKeywords.slice(0, 12),
    matchedKeywords: matchedRoleKeywords.slice(0, 20),
    suggestions,
    sectionFeedback: {
      summary: "Tailor the summary to the target role with 2-3 keyword-aligned strengths.",
      experience: "Prioritize quantified outcomes and impact-focused bullets in recent roles.",
      skills: "Group skills by category and align tools with the selected job role.",
      education: hasEducationSection
        ? "Education is present; add relevant coursework/certifications if needed."
        : "Add a clear education section with degree, institution, and graduation details.",
      formatting:
        "Use consistent headings, tense, and spacing. Keep section titles ATS-friendly and simple."
    }
  };
}

function normalizeAnalysisPayload(raw: ParsedAnalysis, input: AnalyzeInput) {
  const breakdown = raw.breakdown || {};
  const normalizedSuggestions = normalizeStringArray(raw.suggestions, 10);
  const suggestionFallbacks = [
    "Add measurable impact metrics to each experience bullet.",
    "Align the professional summary with the target role keywords.",
    "Strengthen skill section with role-specific technical tools."
  ];

  for (const fallback of suggestionFallbacks) {
    if (normalizedSuggestions.length >= 3) break;
    if (!normalizedSuggestions.includes(fallback)) {
      normalizedSuggestions.push(fallback);
    }
  }

  return {
    breakdown: {
      keywordMatch: clampScore(breakdown.keywordMatch, 0),
      skillMatch: clampScore(breakdown.skillMatch, 0),
      formattingScore: clampScore(breakdown.formattingScore, input.formattingScore),
      experienceScore: clampScore(breakdown.experienceScore, 0),
      educationScore: clampScore(breakdown.educationScore, 0)
    },
    missingSkills: normalizeStringArray(raw.missingSkills, 20),
    matchedKeywords: normalizeStringArray(raw.matchedKeywords, 30),
    suggestions: normalizedSuggestions.slice(0, 10),
    sectionFeedback: {
      summary: toStringValue(raw.sectionFeedback?.summary, "Summary can be more tailored to this role."),
      experience: toStringValue(
        raw.sectionFeedback?.experience,
        "Experience section needs stronger role-aligned achievements."
      ),
      skills: toStringValue(raw.sectionFeedback?.skills, "Skills section should be more specific."),
      education: toStringValue(raw.sectionFeedback?.education, "Education details can be better structured."),
      formatting: toStringValue(
        raw.sectionFeedback?.formatting,
        "Formatting is readable but can be improved for ATS consistency."
      )
    }
  };
}

async function analyzeWithOpenAI(input: AnalyzeInput) {
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const openai = getOpenAIClient();
  const completion = await openai.chat.completions.create({
    model,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: ANALYSIS_PROMPT
      },
      {
        role: "user",
        content: `Target role: ${input.jobRole}\nBaseline formatting score: ${input.formattingScore}\nResume Text: ${input.resumeText}`
      }
    ]
  });

  const raw = completion.choices[0]?.message?.content;

  if (!raw) {
    throw new Error("OpenAI returned empty analysis response.");
  }

  return JSON.parse(extractJsonPayload(raw));
}

async function analyzeWithGemini(input: AnalyzeInput) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const raw = await generateGeminiText({
    apiKey,
    configuredModel: process.env.GEMINI_MODEL,
    prompt: `${ANALYSIS_PROMPT}\nTarget role: ${input.jobRole}\nBaseline formatting score: ${input.formattingScore}\nResume Text: ${input.resumeText}`,
    responseMimeType: "application/json",
    temperature: 0.2
  });

  return JSON.parse(extractJsonPayload(raw));
}

export async function analyzeResumeWithAI(input: AnalyzeInput) {
  const errors: string[] = [];
  let parsed: ParsedAnalysis | null = null;
  let source: AnalysisSource = "unknown";

  for (const provider of getProviderOrder()) {
    if (parsed) break;

    if (provider === "gemini" && process.env.GEMINI_API_KEY) {
      try {
        parsed = (await analyzeWithGemini(input)) as ParsedAnalysis;
        source = "gemini";
      } catch (error) {
        errors.push(error instanceof Error ? error.message : "Gemini failed");
      }
      continue;
    }

    if (provider === "openai" && process.env.OPENAI_API_KEY) {
      try {
        parsed = (await analyzeWithOpenAI(input)) as ParsedAnalysis;
        source = "openai";
      } catch (error) {
        errors.push(error instanceof Error ? error.message : "OpenAI failed");
      }
    }
  }

  if (!parsed) {
    if (errors.length) {
      console.warn("AI analysis fallback activated:", errors.join(" | "));
    }
    parsed = analyzeWithHeuristics(input);
    source = "heuristic";
  }

  const normalized = normalizeAnalysisPayload(parsed, input);

  if (typeof normalized.breakdown.formattingScore === "number") {
    normalized.breakdown.formattingScore = Math.round(
      (normalized.breakdown.formattingScore + input.formattingScore) / 2
    );
  } else {
    normalized.breakdown.formattingScore = input.formattingScore;
  }

  const validated = aiAnalysisSchema.parse(normalized);
  const result: AnalysisOutput = {
    ...validated,
    source
  };

  return result;
}


