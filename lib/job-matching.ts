import OpenAI from "openai";

import { generateGeminiText } from "@/lib/gemini-client";
import { AnalysisSource, InterviewQAItem } from "@/types";

type Provider = "gemini" | "openai";

type JobMatchInput = {
  resumeText: string;
  jobDescriptionText: string;
  jobRole: string;
};

type JobMatchOutput = {
  matchScore: number;
  missingKeywords: string[];
  requiredSkillsGap: string[];
  improvementSuggestions: string[];
  shortlistProbability: number;
  interviewQA: InterviewQAItem[];
  source: AnalysisSource;
};

type ParsedJobMatch = {
  matchScore?: unknown;
  missingKeywords?: unknown;
  requiredSkillsGap?: unknown;
  improvementSuggestions?: unknown;
  shortlistProbability?: unknown;
  interviewQA?: unknown;
};

let client: OpenAI | null = null;

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
  "through",
  "will",
  "must",
  "should",
  "also",
  "ability",
  "candidate",
  "team",
  "teams",
  "required",
  "requirements",
  "responsibilities",
  "qualification",
  "qualifications"
]);

const WEAK_ANSWER_PATTERNS = [
  /\buse\s+star\b/i,
  /\bmention\b/i,
  /\bexplain\b/i,
  /\bdescribe\b/i,
  /\bhighlight\b/i,
  /\bbe ready to\b/i,
  /\balign your\b/i
];

const JOB_MATCH_PROMPT = `You are a senior hiring panel coach and HR-tech matching engine.
Return strict JSON only.

Compare RESUME vs JOB DESCRIPTION and return:
{
  "matchScore": 0,
  "missingKeywords": [""],
  "requiredSkillsGap": [""],
  "improvementSuggestions": [""],
  "shortlistProbability": 0,
  "interviewQA": [
    { "question": "", "answer": "" }
  ]
}

Rules:
- Scores must be integers from 0 to 100.
- missingKeywords: concrete terms from JD that are missing or weak in resume.
- requiredSkillsGap: key skills/capabilities still underrepresented in the resume.
- improvementSuggestions: actionable ATS and interview-readiness improvements.
- interviewQA: EXACTLY 20 entries and every question must be unique.
- Questions must be role/company-specific using JD context.
- Answers must be high-quality, candidate-ready sample answers in first-person style.
- Each answer should be specific, practical, and non-generic (roughly 70-180 words).
- Do NOT write coaching meta-instructions like "Use STAR", "Mention", "Explain", "Describe", "Highlight".
- Do not add markdown, explanations, or extra keys.`;

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

function cleanText(value: unknown, fallback = "") {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  return normalized || fallback;
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
    const normalized = cleanText(item);
    if (!normalized) continue;
    unique.add(normalized);
    if (unique.size >= max) break;
  }

  return Array.from(unique);
}

function cleanKeywordTerm(value: unknown) {
  return cleanText(value)
    .replace(/^[^a-z0-9+#.]+/i, "")
    .replace(/[^a-z0-9+#.\- ]+$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isUsefulKeywordTerm(term: string) {
  if (!term) return false;
  if (term.length < 3 || term.length > 42) return false;
  if (!/[a-z]/i.test(term)) return false;
  if (/^\d+([.\-/]\d+)*$/.test(term)) return false;
  if (/^(etc|misc|other|additional|plus)$/i.test(term)) return false;
  if (STOPWORDS.has(term.toLowerCase())) return false;
  return true;
}

function normalizeKeywordArray(value: unknown, max: number) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  const unique = new Set<string>();
  for (const item of value) {
    const normalized = cleanKeywordTerm(item);
    if (!isUsefulKeywordTerm(normalized)) continue;
    unique.add(normalized);
    if (unique.size >= max) break;
  }
  return Array.from(unique);
}

function tokenizeKeywords(value: string) {
  return Array.from(
    new Set(
      value
        .toLowerCase()
        .split(/[^a-z0-9+#.]+/i)
        .map((entry) => cleanKeywordTerm(entry))
        .filter((entry) => isUsefulKeywordTerm(entry) && !STOPWORDS.has(entry))
    )
  );
}

function extractCompanyHint(jobDescriptionText: string) {
  const text = String(jobDescriptionText || "");
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const companyLine = lines.find((line) => /^company\s*[:|-]/i.test(line));
  if (companyLine) {
    const parsed = companyLine.split(/[:|-]/).slice(1).join(" ").trim();
    if (parsed && parsed.length <= 60) return parsed;
  }

  const joinMatch = text.match(/\bjoin\s+([A-Z][A-Za-z0-9&.' -]{2,48})\b/);
  if (joinMatch?.[1]) {
    const value = joinMatch[1].trim();
    if (value.length <= 60) return value;
  }

  const atMatch = text.match(/\bat\s+([A-Z][A-Za-z0-9&.' -]{2,48})(?:\s|,|\.)/);
  if (atMatch?.[1]) {
    const value = atMatch[1].trim();
    if (value.length <= 60) return value;
  }

  return "";
}

function extractResumeHighlights(resumeText: string) {
  return resumeText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 30)
    .slice(0, 10);
}

function extractStrongResumeEvidence(resumeText: string) {
  return resumeText
    .split(/\r?\n/)
    .map((line) => cleanText(line))
    .filter((line) => line.length > 35)
    .filter(
      (line) =>
        /\b(led|built|delivered|improved|increased|reduced|optimized|developed|implemented|launched|designed)\b/i.test(
          line
        ) || /\b\d+(?:\.\d+)?%?\b/.test(line)
    )
    .slice(0, 8);
}

function questionKey(question: string) {
  return question
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function quoteSnippet(text: string, max = 72) {
  const cleaned = cleanText(text);
  if (!cleaned) return "";
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 3).trim()}...`;
}

function isWeakAnswer(answer: string) {
  const normalized = cleanText(answer);
  if (!normalized) return true;
  if (normalized.length < 90) return true;
  return WEAK_ANSWER_PATTERNS.some((pattern) => pattern.test(normalized));
}

function isWeakQuestion(question: string) {
  const normalized = cleanText(question);
  if (!normalized) return true;
  if (normalized.length < 14) return true;
  return /^can you|^tell me|^what is/i.test(normalized) && normalized.length < 28;
}

function buildFallbackInterviewQA(input: JobMatchInput, missingKeywords: string[], requiredSkillsGap: string[]) {
  const highlights = extractResumeHighlights(input.resumeText);
  const strongEvidence = extractStrongResumeEvidence(input.resumeText);
  const role = cleanText(input.jobRole, "this role");
  const companyHint = extractCompanyHint(input.jobDescriptionText);
  const companyPhrase = companyHint ? ` at ${companyHint}` : " in this company";
  const jdKeywords = tokenizeKeywords(input.jobDescriptionText).slice(0, 10);
  const topMissing = missingKeywords.map((item) => cleanKeywordTerm(item)).filter(isUsefulKeywordTerm).slice(0, 5);
  const topSkillGap = requiredSkillsGap.map((item) => cleanText(item)).filter(Boolean).slice(0, 5);
  const qa: InterviewQAItem[] = [];
  const seenQuestions = new Set<string>();

  const add = (question: string, answer: string) => {
    const normalizedQuestion = cleanText(question);
    const normalizedAnswer = cleanText(answer);
    if (!normalizedQuestion || !normalizedAnswer) return;
    const key = questionKey(normalizedQuestion);
    if (!key || seenQuestions.has(key)) return;
    seenQuestions.add(key);
    qa.push({
      question: normalizedQuestion,
      answer: normalizedAnswer
    });
  };

  const evidence = (index: number) => {
    const line = strongEvidence[index] || highlights[index] || "";
    return line ? `"${quoteSnippet(line, 110)}"` : "";
  };

  add(
    `Walk me through your background and fit for the ${role} role${companyPhrase}.`,
    `I have delivered strong results in role-relevant projects, especially in ${evidence(0) || "cross-functional product delivery"}. I focus on understanding business goals early, converting them into execution plans, and shipping with measurable impact. For this ${role} role${companyPhrase}, I would bring the same execution discipline, stakeholder communication, and outcome-driven mindset from day one.`
  );
  add(
    `Why are you interested in this ${role} position${companyPhrase}?`,
    `I am interested in this role because the JD aligns with the kind of work where I have created impact: building reliable solutions, improving delivery speed, and collaborating closely across teams. I also value the opportunity to contribute in areas like ${jdKeywords.slice(0, 3).join(", ") || "product execution and delivery quality"}, where I can apply proven experience while scaling to larger business outcomes.`
  );
  add(
    `Which resume achievement best demonstrates your readiness for this ${role} role?`,
    `One strong example is ${evidence(1) || "a project where I improved both delivery quality and business impact"}. I identified the core bottleneck, aligned the team around a clear execution path, and delivered measurable improvements. That experience directly maps to this role because it required ownership, prioritization, and consistent delivery under constraints.`
  );
  add(
    "How do you prioritize when handling multiple deadlines?",
    "I prioritize by business impact, delivery risk, and dependency criticality. I break work into must-ship vs nice-to-have outcomes, align expectations with stakeholders early, and surface risks before they become blockers. This allows me to keep quality high while still delivering on urgent commitments."
  );
  add(
    "Describe a time you solved a difficult technical or business problem.",
    `In one project, I faced a complex issue related to ${evidence(2) || "system reliability and delivery speed"}. I decomposed the problem into measurable parts, validated assumptions with data, and implemented a phased fix. The result was improved stability and faster execution, while maintaining cross-team alignment and clear communication throughout.`
  );
  add(
    "How do you ensure quality and reliability in your work?",
    "I build quality into the process from design to release: clear acceptance criteria, peer reviews, automated validation where possible, and post-release monitoring. I also run quick retrospectives after major deliveries so each cycle improves quality, predictability, and team throughput."
  );
  add(
    "Tell me about a time you collaborated cross-functionally.",
    `I regularly work with product, engineering, and business stakeholders to move initiatives from scope to delivery. A strong example is ${evidence(3) || "a delivery where multiple teams had competing priorities"}. I aligned decision-making around shared outcomes, clarified ownership, and kept progress transparent until completion.`
  );
  add(
    "What is your approach to learning new tools or technologies quickly?",
    "I learn in a delivery-first way: I define one practical target, build a small working solution quickly, and then deepen knowledge through implementation feedback. This approach helps me become productive fast while still keeping quality and maintainability high."
  );

  for (const skill of topMissing) {
    add(
      `How have you used ${skill} in past work, and where can you apply it here?`,
      `I have applied adjacent capabilities that map to ${skill}, and I can ramp quickly by combining focused learning with immediate project execution. In this role, I would target an early deliverable using ${skill}, align with a senior reviewer for fast feedback, and turn that into repeatable output within the first few weeks.`
    );
  }

  for (const gap of topSkillGap) {
    add(
      `How would you close the gap in ${gap} during your first 30-60 days?`,
      "My first 30-60 day plan would include three tracks: targeted skill ramp-up, a scoped production deliverable, and recurring checkpoints with stakeholders. I would define success metrics early, ship a practical use case, and iteratively strengthen depth until the capability becomes fully reliable."
    );
  }

  highlights.slice(0, 6).forEach((line, index) => {
    const snippet = quoteSnippet(line);
    add(
      `In your resume, you mention "${snippet}". What challenge did you solve and what was the measurable outcome?`,
      `In that project, I started by identifying the root constraint and prioritizing the work with the highest business impact. I executed with clear milestones, coordinated with the right stakeholders, and validated outcomes using measurable signals. The result was stronger delivery confidence and tangible performance improvement. (Example ${index + 1})`
    );
  });

  for (const keyword of topMissing.slice(0, 3)) {
    add(
      `The JD emphasizes ${keyword}. How will you demonstrate this capability in your first 90 days?`,
      `I would demonstrate ${keyword} through a staged 30-60-90 plan: learn company context, deliver one scoped use case tied to team goals, and then expand ownership to a broader workflow. I would measure success using delivery speed, quality outcomes, and stakeholder feedback.`
    );
  }

  const fillerQuestions = [
    "How do you handle feedback on your work?",
    "How do you communicate complex topics to non-technical stakeholders?",
    "Describe a time you made a process more efficient.",
    "How do you define success for this role in the first 90 days?",
    "What risks do you anticipate for this role, and how would you mitigate them?",
    "Tell me about a time you had to make a decision with incomplete information.",
    "How do you keep your work aligned with business goals?",
    "What is one weakness you are actively improving?"
  ];

  for (const question of fillerQuestions) {
    add(
      question,
      "I answer these situations by tying decisions to business impact, showing ownership, and citing specific results from past projects. I focus on clear tradeoffs, execution discipline, and communication that keeps stakeholders aligned through delivery."
    );
  }

  const reserveQuestions = [
    `What are the top risks in this ${role} role, and how would you handle them?`,
    `How would your past projects from the resume transfer to this ${role} position?`,
    `Which KPI would you prioritize first in this ${role} role and why?`,
    "How do you balance speed and quality under pressure?",
    "Tell me about a time you influenced a decision without direct authority.",
    "What would your first 30 days in this role look like?",
    "How do you validate that your solution solved the right problem?",
    "How have you handled ambiguity in previous projects?"
  ];

  for (const question of reserveQuestions) {
    add(
      question,
      "I would connect this directly to similar responsibilities I have handled, explain my execution approach, and show how I would deliver measurable outcomes aligned with the team's priorities."
    );
  }

  let fillerIndex = 1;
  while (qa.length < 20) {
    add(
      `Role-fit scenario ${fillerIndex}: how would you apply your resume strengths to deliver early impact in ${role}?`,
      `I would start with a scoped problem aligned to the highest-priority requirement, apply proven methods from my past delivery work, and ship a concrete improvement that can be measured quickly. Then I would iterate with stakeholder feedback to expand impact over the quarter.`
    );
    fillerIndex += 1;
  }

  return qa.slice(0, 20);
}

function normalizeInterviewQA(
  value: unknown,
  input: JobMatchInput,
  missingKeywords: string[],
  requiredSkillsGap: string[]
) {
  const rows = Array.isArray(value) ? value : [];
  const normalized: InterviewQAItem[] = [];
  const seenQuestions = new Set<string>();

  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const entry = row as Record<string, unknown>;
    const question = cleanText(entry.question);
    const answer = cleanText(entry.answer);
    if (!question || !answer) continue;
    if (isWeakQuestion(question) || isWeakAnswer(answer)) continue;
    const key = questionKey(question);
    if (!key || seenQuestions.has(key)) continue;
    seenQuestions.add(key);
    normalized.push({
      question,
      answer: answer.length > 520 ? `${answer.slice(0, 517).trim()}...` : answer
    });
    if (normalized.length >= 20) break;
  }

  if (normalized.length < 20) {
    const fallback = buildFallbackInterviewQA(input, missingKeywords, requiredSkillsGap);
    for (const qa of fallback) {
      const key = questionKey(qa.question);
      if (!key || seenQuestions.has(key)) continue;
      if (isWeakQuestion(qa.question) || isWeakAnswer(qa.answer)) continue;
      seenQuestions.add(key);
      normalized.push(qa);
      if (normalized.length >= 20) break;
    }
  }

  return normalized.slice(0, 20);
}

function mergeInterviewQA(primary: InterviewQAItem[], secondary: InterviewQAItem[]) {
  const merged: InterviewQAItem[] = [];
  const seen = new Set<string>();

  for (const item of [...primary, ...secondary]) {
    const question = cleanText(item.question);
    const answer = cleanText(item.answer);
    const key = questionKey(question);
    if (!question || !answer || !key || seen.has(key)) continue;
    if (isWeakQuestion(question) || isWeakAnswer(answer)) continue;
    seen.add(key);
    merged.push({ question, answer });
    if (merged.length >= 20) break;
  }

  return merged;
}

function interviewQAQuality(input: JobMatchInput, interviewQA: InterviewQAItem[]) {
  const roleTokens = tokenizeKeywords(input.jobRole).slice(0, 6);
  const jdTokens = tokenizeKeywords(input.jobDescriptionText).slice(0, 14);
  const anchorTokens = new Set([...roleTokens, ...jdTokens]);

  let weakAnswers = 0;
  let weakQuestions = 0;
  let anchoredQuestions = 0;

  for (const item of interviewQA) {
    const question = cleanText(item.question).toLowerCase();
    const answer = cleanText(item.answer);

    if (isWeakAnswer(answer)) weakAnswers += 1;
    if (isWeakQuestion(question)) weakQuestions += 1;

    if (Array.from(anchorTokens).some((token) => token && question.includes(token.toLowerCase()))) {
      anchoredQuestions += 1;
    }
  }

  const countScore = Math.min(40, interviewQA.length * 2);
  const qualityScore = Math.max(0, 40 - weakAnswers * 5 - weakQuestions * 4);
  const anchorScore = Math.min(20, anchoredQuestions * 2);
  const total = countScore + qualityScore + anchorScore;

  return {
    total,
    weakAnswers,
    weakQuestions,
    anchoredQuestions
  };
}

function heuristicJobMatch(input: JobMatchInput): ParsedJobMatch {
  const resumeLower = input.resumeText.toLowerCase();
  const jdKeywords = tokenizeKeywords(input.jobDescriptionText).slice(0, 80);
  const matchedKeywords = jdKeywords.filter((keyword) => resumeLower.includes(keyword));
  const missingKeywords = jdKeywords.filter((keyword) => !resumeLower.includes(keyword));

  const metricHits = (input.resumeText.match(/\b\d+(?:\.\d+)?%?\b/g) || []).length;
  const actionVerbHits = (
    input.resumeText.match(
      /\b(led|built|delivered|improved|increased|reduced|optimized|developed|implemented|launched)\b/gi
    ) || []
  ).length;
  const overlapRatio = matchedKeywords.length / Math.max(jdKeywords.length, 1);

  const matchScore = clampScore(Math.round(overlapRatio * 100 * 0.82 + Math.min(metricHits, 12) + Math.min(actionVerbHits, 10)), 52);
  const shortlistProbability = clampScore(matchScore - Math.min(missingKeywords.length, 20) + 15, 48);

  const requiredSkillsGap = missingKeywords.slice(0, 15);

  const improvementSuggestions = [
    "Integrate top JD keywords naturally into summary, experience, and skills sections.",
    "Add measurable impact metrics to recent bullets to strengthen recruiter confidence.",
    "Prioritize resume bullets that map directly to the role's core responsibilities.",
    "Show stronger evidence for missing required skills with specific project outcomes.",
    "Prepare STAR stories for critical JD themes to improve interview performance."
  ];

  return {
    matchScore,
    missingKeywords: missingKeywords.slice(0, 25),
    requiredSkillsGap,
    improvementSuggestions,
    shortlistProbability,
    interviewQA: buildFallbackInterviewQA(input, missingKeywords.slice(0, 12), requiredSkillsGap)
  };
}

function normalizeJobMatchPayload(raw: ParsedJobMatch, input: JobMatchInput) {
  const missingKeywords = normalizeKeywordArray(raw.missingKeywords, 25);
  const requiredSkillsGap = normalizeKeywordArray(raw.requiredSkillsGap, 25);
  const improvementSuggestions = normalizeStringArray(raw.improvementSuggestions, 12);

  const fallbacks = [
    "Mirror priority JD keywords in summary and role-specific bullets.",
    "Quantify outcomes in at least 3 experience bullets.",
    "Prepare examples for each critical skill listed in the JD."
  ];

  for (const fallback of fallbacks) {
    if (improvementSuggestions.length >= 3) break;
    if (!improvementSuggestions.includes(fallback)) {
      improvementSuggestions.push(fallback);
    }
  }

  const normalizedInterviewQA = normalizeInterviewQA(raw.interviewQA, input, missingKeywords, requiredSkillsGap);
  const fallbackInterviewQA = buildFallbackInterviewQA(input, missingKeywords, requiredSkillsGap);
  const mergedInterviewQA = mergeInterviewQA(normalizedInterviewQA, fallbackInterviewQA);
  const quality = interviewQAQuality(input, mergedInterviewQA);

  const finalInterviewQA =
    quality.total < 72 || quality.weakAnswers > 2 || mergedInterviewQA.length < 20
      ? buildFallbackInterviewQA(input, missingKeywords, requiredSkillsGap)
      : mergedInterviewQA.slice(0, 20);

  return {
    matchScore: clampScore(raw.matchScore, 50),
    missingKeywords,
    requiredSkillsGap,
    improvementSuggestions,
    shortlistProbability: clampScore(raw.shortlistProbability, 50),
    interviewQA: finalInterviewQA
  };
}

function buildJobMatchInputPrompt(input: JobMatchInput) {
  const companyHint = extractCompanyHint(input.jobDescriptionText);
  const jdTerms = tokenizeKeywords(input.jobDescriptionText).slice(0, 30);
  const evidenceLines = extractStrongResumeEvidence(input.resumeText).slice(0, 8);

  return [
    `Target role: ${input.jobRole}`,
    companyHint ? `Company hint: ${companyHint}` : "Company hint: not explicitly provided",
    `Priority JD terms: ${jdTerms.join(", ") || "none"}`,
    "Resume evidence highlights:",
    evidenceLines.length ? evidenceLines.map((line, index) => `${index + 1}. ${line}`).join("\n") : "none",
    "",
    "Resume text:",
    input.resumeText,
    "",
    "Job description text:",
    input.jobDescriptionText
  ].join("\n");
}

async function matchWithOpenAI(input: JobMatchInput) {
  const model = process.env.OPENAI_INTERVIEW_MODEL || process.env.OPENAI_MODEL || "gpt-4o";
  const openai = getOpenAIClient();
  const completion = await openai.chat.completions.create({
    model,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: JOB_MATCH_PROMPT
      },
      {
        role: "user",
        content: buildJobMatchInputPrompt(input)
      }
    ]
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("OpenAI returned empty job matching response.");
  }

  return JSON.parse(extractJsonPayload(raw));
}

async function matchWithGemini(input: JobMatchInput) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const raw = await generateGeminiText({
    apiKey,
    configuredModel: process.env.GEMINI_MODEL,
    prompt: `${JOB_MATCH_PROMPT}\n${buildJobMatchInputPrompt(input)}`,
    responseMimeType: "application/json",
    temperature: 0.2
  });

  return JSON.parse(extractJsonPayload(raw));
}

export async function generateJobMatch(input: JobMatchInput): Promise<JobMatchOutput> {
  const errors: string[] = [];
  let parsed: ParsedJobMatch | null = null;
  let source: AnalysisSource = "unknown";

  for (const provider of getProviderOrder()) {
    if (parsed) break;

    if (provider === "gemini" && process.env.GEMINI_API_KEY) {
      try {
        parsed = (await matchWithGemini(input)) as ParsedJobMatch;
        source = "gemini";
      } catch (error) {
        errors.push(error instanceof Error ? error.message : "Gemini job match failed");
      }
      continue;
    }

    if (provider === "openai" && process.env.OPENAI_API_KEY) {
      try {
        parsed = (await matchWithOpenAI(input)) as ParsedJobMatch;
        source = "openai";
      } catch (error) {
        errors.push(error instanceof Error ? error.message : "OpenAI job match failed");
      }
    }
  }

  if (!parsed) {
    if (errors.length) {
      console.warn("Job match fallback activated:", errors.join(" | "));
    }
    parsed = heuristicJobMatch(input);
    source = "heuristic";
  }

  const normalized = normalizeJobMatchPayload(parsed, input);

  return {
    ...normalized,
    source
  };
}
