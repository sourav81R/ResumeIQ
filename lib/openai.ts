import OpenAI from "openai";

import { aiAnalysisSchema } from "@/lib/atsScoring";

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

  const configuredModel = (process.env.GEMINI_MODEL || "gemini-2.5-flash").trim();
  const tried: string[] = [];
  let lastError = "";

  const modelCandidates = Array.from(
    new Set([
      configuredModel.replace(/^models\//, ""),
      configuredModel,
      "gemini-2.5-flash",
      "gemini-2.5-flash-latest",
      "gemini-2.0-flash",
      "gemini-1.5-flash-latest"
    ])
  );

  const apiVersions = ["v1beta", "v1"];

  for (const apiVersion of apiVersions) {
    for (const candidate of modelCandidates) {
      const normalizedModel = candidate.replace(/^models\//, "");
      const endpoint = `https://generativelanguage.googleapis.com/${apiVersion}/models/${encodeURIComponent(normalizedModel)}:generateContent?key=${apiKey}`;
      tried.push(`${apiVersion}:${normalizedModel}`);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json"
          },
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `${ANALYSIS_PROMPT}\nTarget role: ${input.jobRole}\nBaseline formatting score: ${input.formattingScore}\nResume Text: ${input.resumeText}`
                }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        lastError = await response.text();
        if (response.status === 404) {
          continue;
        }
        throw new Error(`Gemini API error: ${response.status} ${lastError}`);
      }

      const data = (await response.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{ text?: string }>;
          };
        }>;
      };

      const raw = data.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join("")
        .trim();

      if (!raw) {
        throw new Error("Gemini returned empty analysis response.");
      }

      return JSON.parse(extractJsonPayload(raw));
    }
  }

  throw new Error(
    `Gemini model unavailable. Tried: ${tried.join(", ")}. Last error: ${lastError || "NOT_FOUND"}`
  );
}

export async function analyzeResumeWithAI(input: AnalyzeInput) {
  const parsed = (process.env.GEMINI_API_KEY
    ? await analyzeWithGemini(input)
    : await analyzeWithOpenAI(input)) as ParsedAnalysis;

  const normalized = normalizeAnalysisPayload(parsed, input);

  if (typeof normalized.breakdown.formattingScore === "number") {
    normalized.breakdown.formattingScore = Math.round(
      (normalized.breakdown.formattingScore + input.formattingScore) / 2
    );
  } else {
    normalized.breakdown.formattingScore = input.formattingScore;
  }

  return aiAnalysisSchema.parse(normalized);
}


