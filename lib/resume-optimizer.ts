import OpenAI from "openai";
import { z } from "zod";

import { calculateATSScore } from "@/lib/atsScoring";
import { generateGeminiText } from "@/lib/gemini-client";
import { ResumeTemplate } from "@/types";

const emptyExperienceItem = {
  company: "",
  role: "",
  location: "",
  startDate: "",
  endDate: "",
  bullets: [] as string[]
};

const emptyEducationItem = {
  institution: "",
  degree: "",
  startDate: "",
  endDate: "",
  details: [] as string[]
};

const emptyProjectItem = {
  name: "",
  role: "",
  tech: [] as string[],
  link: "",
  bullets: [] as string[]
};

const optimizedResumeSchema = z.object({
  header: z
    .object({
      name: z.string().catch(""),
      role: z.string().catch(""),
      email: z.string().catch(""),
      phone: z.string().catch(""),
      location: z.string().catch(""),
      links: z.array(z.string().catch("")).catch([]),
      photoUrl: z.string().optional().catch("")
    })
    .catch({
      name: "",
      role: "",
      email: "",
      phone: "",
      location: "",
      links: [],
      photoUrl: ""
    }),
  summary: z.string().catch(""),
  experience: z
    .array(
      z
        .object({
          company: z.string().catch(""),
          role: z.string().catch(""),
          location: z.string().catch(""),
          startDate: z.string().catch(""),
          endDate: z.string().catch(""),
          bullets: z.array(z.string().catch("")).catch([])
        })
        .catch(emptyExperienceItem)
    )
    .catch([]),
  education: z
    .array(
      z
        .object({
          institution: z.string().catch(""),
          degree: z.string().catch(""),
          startDate: z.string().catch(""),
          endDate: z.string().catch(""),
          details: z.array(z.string().catch("")).catch([])
        })
        .catch(emptyEducationItem)
    )
    .catch([]),
  projects: z
    .array(
      z
        .object({
          name: z.string().catch(""),
          role: z.string().catch(""),
          tech: z.array(z.string().catch("")).catch([]),
          link: z.string().optional().catch(""),
          bullets: z.array(z.string().catch("")).catch([])
        })
        .catch(emptyProjectItem)
    )
    .catch([]),
  skills: z
    .object({
      core: z.array(z.string().catch("")).catch([]),
      tools: z.array(z.string().catch("")).catch([]),
      soft: z.array(z.string().catch("")).catch([])
    })
    .catch({
      core: [],
      tools: [],
      soft: []
    }),
  certifications: z.array(z.string().catch("")).catch([]),
  improvedLines: z.array(z.string().catch("")).catch([]),
  improvedBreakdown: z
    .object({
      keywordMatch: z.unknown().catch(0),
      skillMatch: z.unknown().catch(0),
      formattingScore: z.unknown().catch(0),
      experienceScore: z.unknown().catch(0),
      educationScore: z.unknown().catch(0)
    })
    .catch({
      keywordMatch: 0,
      skillMatch: 0,
      formattingScore: 0,
      experienceScore: 0,
      educationScore: 0
    })
});

type OptimizerInput = {
  resumeText: string;
  jobRole: string;
  currentAtsScore: number;
  feedback: {
    missingSkills: string[];
    matchedKeywords: string[];
    suggestions: string[];
    sectionFeedback: {
      summary: string;
      experience: string;
      skills: string;
      education: string;
      formatting: string;
    };
  };
  template: ResumeTemplate;
};

type Provider = "gemini" | "openai";

let client: OpenAI | null = null;

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
  if (client) return client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");
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

function cleanText(value: unknown, fallback = "") {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  return normalized || fallback;
}

function normalizeStringArray(value: unknown, max = 10) {
  if (!Array.isArray(value)) return [];

  const out: string[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    const normalized = cleanText(item);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
    if (out.length >= max) break;
  }

  return out;
}

function normalizePhotoDataUrl(value: unknown) {
  const normalized = cleanText(value);
  if (!normalized) return "";
  if (!/^data:image\/(?:png|jpeg|jpg);base64,[A-Za-z0-9+/=]+$/i.test(normalized)) return "";
  if (normalized.length > 350000) return "";
  return normalized;
}

function clampScore(value: unknown, fallback = 0) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function extractEmail(text: string) {
  return text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
}

function extractPhone(text: string) {
  return text.match(/(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}/)?.[0] || "";
}

function extractLinks(text: string) {
  return Array.from(
    new Set(
      (text.match(/\b(?:https?:\/\/|www\.)[^\s)]+/gi) || [])
        .map((url) => url.replace(/[.,;]$/, "").trim())
        .filter(Boolean)
    )
  ).slice(0, 4);
}

function firstNonEmptyLine(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0) || "";
}

function fallbackOptimizedPayload(input: OptimizerInput) {
  const resumeText = input.resumeText || "";
  const lines = resumeText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const firstLine = firstNonEmptyLine(resumeText);
  const likelyName = firstLine && firstLine.length <= 60 && !firstLine.includes("@") ? firstLine : "Candidate Name";
  const email = extractEmail(resumeText);
  const phone = extractPhone(resumeText);
  const links = extractLinks(resumeText);

  const sentenceChunks = resumeText
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 20);
  const summary =
    sentenceChunks.slice(0, 2).join(" ").slice(0, 400) ||
    `Professional candidate targeting ${input.jobRole} with strengths in delivery, collaboration, and role-relevant execution.`;

  const improvedBreakdown = {
    keywordMatch: Math.min(100, Math.max(45, input.currentAtsScore + 8)),
    skillMatch: Math.min(100, Math.max(45, input.currentAtsScore + 6)),
    formattingScore: Math.min(100, Math.max(40, input.currentAtsScore + 4)),
    experienceScore: Math.min(100, Math.max(45, input.currentAtsScore + 7)),
    educationScore: Math.min(100, Math.max(45, input.currentAtsScore + 5))
  };

  const improvedLines = Array.from(
    new Set(
      [
        ...input.feedback.suggestions.slice(0, 5),
        ...input.feedback.missingSkills.slice(0, 3).map(
          (skill) => `Add evidence of ${skill} in experience bullets when applicable.`
        )
      ].filter(Boolean)
    )
  ).slice(0, 12);

  const roleBullet = `Tailored resume content for ${input.jobRole} with clearer impact-oriented language.`;
  const fallbackBullets = [roleBullet, ...lines.slice(0, 2).map((line) => line.slice(0, 170))].filter(Boolean);

  return {
    header: {
      name: likelyName,
      role: input.jobRole,
      email,
      phone,
      location: "",
      links,
      photoUrl: ""
    },
    summary,
    experience: [
      {
        company: "",
        role: input.jobRole,
        location: "",
        startDate: "",
        endDate: "",
        bullets: fallbackBullets.slice(0, 4)
      }
    ],
    education: [],
    projects: [],
    skills: {
      core: input.feedback.matchedKeywords.slice(0, 8),
      tools: input.feedback.missingSkills.slice(0, 6),
      soft: ["Communication", "Collaboration", "Problem Solving"]
    },
    certifications: [],
    improvedLines,
    improvedBreakdown
  };
}

function normalizeOptimizedResult(raw: unknown, currentAtsScore: number) {
  const parsed = optimizedResumeSchema.parse(raw);

  const breakdown = {
    keywordMatch: clampScore(parsed.improvedBreakdown.keywordMatch, 0),
    skillMatch: clampScore(parsed.improvedBreakdown.skillMatch, 0),
    formattingScore: clampScore(parsed.improvedBreakdown.formattingScore, 0),
    experienceScore: clampScore(parsed.improvedBreakdown.experienceScore, 0),
    educationScore: clampScore(parsed.improvedBreakdown.educationScore, 0)
  };

  const atsScore = calculateATSScore(breakdown);
  const adjustedAtsScore = Math.max(currentAtsScore, atsScore);

  return {
    content: {
      header: {
        name: cleanText(parsed.header.name, "Candidate Name"),
        role: cleanText(parsed.header.role, "Professional"),
        email: cleanText(parsed.header.email),
        phone: cleanText(parsed.header.phone),
        location: cleanText(parsed.header.location),
        links: normalizeStringArray(parsed.header.links, 6),
        photoUrl: normalizePhotoDataUrl(parsed.header.photoUrl)
      },
      summary: cleanText(parsed.summary),
      experience: parsed.experience.map((item) => ({
        company: cleanText(item.company),
        role: cleanText(item.role),
        location: cleanText(item.location),
        startDate: cleanText(item.startDate),
        endDate: cleanText(item.endDate),
        bullets: normalizeStringArray(item.bullets, 8)
      })),
      education: parsed.education.map((item) => ({
        institution: cleanText(item.institution),
        degree: cleanText(item.degree),
        startDate: cleanText(item.startDate),
        endDate: cleanText(item.endDate),
        details: normalizeStringArray(item.details, 5)
      })),
      projects: parsed.projects.map((item) => ({
        name: cleanText(item.name),
        role: cleanText(item.role),
        tech: normalizeStringArray(item.tech, 8),
        link: cleanText(item.link),
        bullets: normalizeStringArray(item.bullets, 6)
      })),
      skills: {
        core: normalizeStringArray(parsed.skills.core, 20),
        tools: normalizeStringArray(parsed.skills.tools, 20),
        soft: normalizeStringArray(parsed.skills.soft, 20)
      },
      certifications: normalizeStringArray(parsed.certifications, 10)
    },
    scores: {
      ...breakdown,
      atsScore: adjustedAtsScore
    },
    changedLines: normalizeStringArray(parsed.improvedLines, 20),
    improvementScore: Math.max(0, adjustedAtsScore - currentAtsScore)
  };
}

function buildPrompt(input: OptimizerInput) {
  const feedback = JSON.stringify(input.feedback, null, 2);

  return `You are an expert ATS resume writer.
Return only strict JSON.

GOAL:
- Build a brand-new optimized resume from the raw resume text and feedback.
- Preserve original facts (name, companies, education, projects, skills) but improve phrasing and structure.
- Rewrite weak bullets into strong action-oriented bullets with measurable impact.
- Optimize keywords for ATS and ${input.jobRole}.
- Follow selected template style exactly: ${input.template.name} (${input.template.layout}).
- Template style guidance: ${input.template.promptHint}

RESPONSE JSON SHAPE:
{
  "header": { "name": "", "role": "", "email": "", "phone": "", "location": "", "links": [""] },
  "summary": "",
  "experience": [{ "company": "", "role": "", "location": "", "startDate": "", "endDate": "", "bullets": [""] }],
  "education": [{ "institution": "", "degree": "", "startDate": "", "endDate": "", "details": [""] }],
  "projects": [{ "name": "", "role": "", "tech": [""], "link": "", "bullets": [""] }],
  "skills": { "core": [""], "tools": [""], "soft": [""] },
  "certifications": [""],
  "improvedLines": [""],
  "improvedBreakdown": {
    "keywordMatch": 0,
    "skillMatch": 0,
    "formattingScore": 0,
    "experienceScore": 0,
    "educationScore": 0
  }
}

CONSTRAINTS:
- Keep bullet points concise and impact-driven.
- Do not fabricate unrealistic metrics.
- Preserve all major user data from source resume (experience roles, companies, projects, education, certifications, skills).
- Do not drop sections or entries unless the source truly does not contain them.
- Keep all score values between 0 and 100.

INPUT:
Current ATS Score: ${input.currentAtsScore}
Target Job Role: ${input.jobRole}
Feedback JSON: ${feedback}
Raw Resume Text: ${input.resumeText}`;
}

async function generateWithOpenAI(input: OptimizerInput) {
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const completion = await getOpenAIClient().chat.completions.create({
    model,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are a resume optimization assistant. Always return strict JSON matching the requested schema."
      },
      {
        role: "user",
        content: buildPrompt(input)
      }
    ]
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("OpenAI returned empty resume optimization response.");
  }

  return JSON.parse(extractJsonPayload(raw));
}

async function generateWithGemini(input: OptimizerInput) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const raw = await generateGeminiText({
    apiKey,
    configuredModel: process.env.GEMINI_MODEL,
    prompt: buildPrompt(input),
    responseMimeType: "application/json",
    temperature: 0.2
  });

  return JSON.parse(extractJsonPayload(raw));
}

export async function generateOptimizedResumeWithAI(input: OptimizerInput) {
  const errors: string[] = [];
  let raw: unknown = null;

  for (const provider of getProviderOrder()) {
    if (raw) break;

    if (provider === "gemini" && process.env.GEMINI_API_KEY) {
      try {
        raw = await generateWithGemini(input);
      } catch (error) {
        errors.push(error instanceof Error ? error.message : "Gemini optimization failed");
      }
      continue;
    }

    if (provider === "openai" && process.env.OPENAI_API_KEY) {
      try {
        raw = await generateWithOpenAI(input);
      } catch (error) {
        errors.push(error instanceof Error ? error.message : "OpenAI optimization failed");
      }
    }
  }

  if (!raw) {
    if (errors.length) {
      console.warn("Resume optimization fallback activated:", errors.join(" | "));
    }
    raw = fallbackOptimizedPayload(input);
  }

  return normalizeOptimizedResult(raw, input.currentAtsScore);
}
