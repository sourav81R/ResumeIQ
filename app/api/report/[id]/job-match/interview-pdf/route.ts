import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, PDFFont, StandardFonts, rgb } from "pdf-lib";

import { requireApiUser } from "@/lib/auth-server";
import { getResumeById } from "@/lib/resume-store";

type Params = {
  params: {
    id: string;
  };
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 36;
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
  "also"
]);
const WEAK_ANSWER_PATTERNS = [/\buse\s+star\b/i, /\bmention\b/i, /\bexplain\b/i, /\bdescribe\b/i, /\bhighlight\b/i];

function cleanText(value: unknown) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function questionKey(question: string) {
  return question
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function answerKey(answer: string) {
  return answer
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

function extractResumeHighlights(resumeText: string) {
  return resumeText
    .split(/\r?\n/)
    .map((line) => cleanText(line))
    .filter((line) => line.length > 30)
    .slice(0, 6);
}

function snippet(text: string, max = 70) {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3).trim()}...`;
}

function isWeakAnswer(answer: string) {
  const normalized = cleanText(answer);
  if (normalized.length < 90) return true;
  return WEAK_ANSWER_PATTERNS.some((pattern) => pattern.test(normalized));
}

function buildSupplementalQuestions(resume: NonNullable<Awaited<ReturnType<typeof getResumeById>>>) {
  const role = cleanText(resume.jobRole) || "this role";
  const highlights = extractResumeHighlights(resume.resumeText || "");
  const jdKeywords = tokenizeKeywords(resume.jobMatch?.jobDescriptionText || "").slice(0, 8);
  const missing = (resume.jobMatch?.missingKeywords || []).slice(0, 6);
  const gaps = (resume.jobMatch?.requiredSkillsGap || []).slice(0, 6);

  const items: Array<{ question: string; answer: string }> = [
    {
      question: `What makes you a strong fit for the ${role} role based on your resume?`,
      answer: `Connect your top resume outcomes to the highest-priority responsibilities in the ${role} JD.`
    },
    {
      question: `What would your first 30 days look like in this ${role} role?`,
      answer: "Outline onboarding goals, quick wins, and one measurable deliverable."
    },
    {
      question: "How do you prioritize tasks when multiple high-impact requests arrive together?",
      answer: "Explain your prioritization framework, communication cadence, and risk management approach."
    },
    {
      question: "Describe a time you improved an existing process end-to-end.",
      answer: "Use STAR, emphasize your ownership, and quantify before/after results."
    }
  ];

  jdKeywords.forEach((keyword) => {
    items.push({
      question: `How will you apply ${keyword} effectively in this ${role} role?`,
      answer: `Share one relevant resume example and explain how you'd adapt it to this team's context around ${keyword}.`
    });
  });

  missing.forEach((keyword) => {
    items.push({
      question: `The JD emphasizes ${keyword}. How would you close that gap quickly if selected?`,
      answer: `For ${keyword}, I would run a 30-60-90 day upskilling and delivery plan with one scoped feature in month one, measurable improvement by month two, and ownership expansion by month three.`
    });
  });

  gaps.forEach((gap) => {
    items.push({
      question: `How would you demonstrate capability in ${gap} during your first quarter?`,
      answer: `To demonstrate capability in ${gap}, I would define quarterly milestones, deliver one production use case, and review impact with stakeholders using agreed success metrics.`
    });
  });

  highlights.forEach((line, index) => {
    items.push({
      question: `In your resume you mention "${snippet(line)}". What was your exact contribution and impact?`,
      answer: `Break down the situation, your decisions, execution details, and measurable outcome from example ${index + 1}.`
    });
  });

  return items;
}

function ensureTwentyUniqueInterviewQA(resume: NonNullable<Awaited<ReturnType<typeof getResumeById>>>) {
  const sourceItems = resume.jobMatch?.interviewQA || [];
  const unique: Array<{ question: string; answer: string }> = [];
  const seenQuestions = new Set<string>();
  const seenAnswers = new Set<string>();

  for (const item of sourceItems) {
    const question = cleanText(item.question);
    const answer = cleanText(item.answer);
    const questionId = questionKey(question);
    const answerId = answerKey(answer);
    if (!question || !answer || !questionId || seenQuestions.has(questionId) || !answerId || seenAnswers.has(answerId) || isWeakAnswer(answer)) continue;
    seenQuestions.add(questionId);
    seenAnswers.add(answerId);
    unique.push({ question, answer });
    if (unique.length >= 20) break;
  }

  if (unique.length < 20) {
    const supplemental = buildSupplementalQuestions(resume);
    for (const item of supplemental) {
      const questionId = questionKey(item.question);
      const answerId = answerKey(item.answer);
      if (!questionId || seenQuestions.has(questionId) || !answerId || seenAnswers.has(answerId)) continue;
      seenQuestions.add(questionId);
      seenAnswers.add(answerId);
      unique.push(item);
      if (unique.length >= 20) break;
    }
  }

  let index = 1;
  while (unique.length < 20) {
    const question = `Role-fit follow-up ${index}: how would you convert your resume strengths into measurable outcomes in this role?`;
    const answer = `For follow-up ${index}, I would map one resume project to a top JD requirement, ship a scoped deliverable, and track impact using clear success metrics agreed with stakeholders.`;
    const questionId = questionKey(question);
    const answerId = answerKey(answer);
    if (!seenQuestions.has(questionId) && !seenAnswers.has(answerId)) {
      seenQuestions.add(questionId);
      seenAnswers.add(answerId);
      unique.push({
        question,
        answer
      });
    }
    index += 1;
  }

  return unique.slice(0, 20);
}

function wrapText(text: string, maxWidth: number, font: PDFFont, size: number) {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [""];

  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const next = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(next, size);
    if (width <= maxWidth || !currentLine) {
      currentLine = next;
      continue;
    }

    lines.push(currentLine);
    currentLine = word;
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

async function buildInterviewQAPdf(resume: NonNullable<Awaited<ReturnType<typeof getResumeById>>>) {
  if (!resume.jobMatch || resume.jobMatch.interviewQA.length === 0) {
    throw new Error("No interview Q&A available for this report yet.");
  }
  const interviewQA = ensureTwentyUniqueInterviewQA(resume);

  const pdfDoc = await PDFDocument.create();
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const titleColor = rgb(0.05, 0.24, 0.37);
  const bodyColor = rgb(0.1, 0.14, 0.2);
  const mutedColor = rgb(0.35, 0.39, 0.46);
  const dividerColor = rgb(0.84, 0.88, 0.92);

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;
  const maxWidth = PAGE_WIDTH - MARGIN * 2;

  const ensureSpace = (required: number) => {
    if (y - required < MARGIN) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
  };

  const drawLine = (text: string, options?: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; lineGap?: number }) => {
    const size = options?.size ?? 10;
    const lineGap = options?.lineGap ?? 3;
    const font = options?.bold ? boldFont : regularFont;
    const lines = wrapText(text, maxWidth, font, size);
    const lineHeight = size + lineGap;

    for (const line of lines) {
      ensureSpace(lineHeight);
      page.drawText(line, {
        x: MARGIN,
        y: y - size,
        size,
        font,
        color: options?.color || bodyColor
      });
      y -= lineHeight;
    }
  };

  const drawDivider = () => {
    ensureSpace(10);
    const yLine = y - 2;
    page.drawLine({
      start: { x: MARGIN, y: yLine },
      end: { x: PAGE_WIDTH - MARGIN, y: yLine },
      color: dividerColor,
      thickness: 0.8
    });
    y -= 6;
  };

  const addGap = (value: number) => {
    ensureSpace(value);
    y -= value;
  };

  drawLine("ResumeIQ Interview Preparation Pack", { size: 19, bold: true, color: titleColor, lineGap: 4 });
  drawLine(`Role: ${resume.jobRole}`, { size: 11.5, bold: true, color: bodyColor, lineGap: 3 });
  drawLine(`Match Score: ${resume.jobMatch.matchScore}% | Shortlist Probability: ${resume.jobMatch.shortlistProbability}%`, {
    size: 10,
    color: mutedColor
  });
  drawLine(`Generated: ${new Date(resume.jobMatch.updatedAt).toLocaleString()}`, { size: 9.5, color: mutedColor });
  addGap(3);
  drawDivider();
  addGap(2);

  drawLine("Top Improvement Suggestions", { size: 12, bold: true, color: titleColor });
  const suggestions = resume.jobMatch.improvementSuggestions.slice(0, 6);
  if (suggestions.length) {
    suggestions.forEach((suggestion, index) => {
      drawLine(`${index + 1}. ${suggestion}`, { size: 9.8, color: bodyColor, lineGap: 2.4 });
    });
  } else {
    drawLine("No suggestions available.", { size: 9.8, color: bodyColor });
  }

  addGap(4);
  drawDivider();
  addGap(2);
  drawLine("20 Tailored Interview Questions & Suggested Answers", { size: 12, bold: true, color: titleColor });
  addGap(2);

  interviewQA.forEach((item, index) => {
    drawLine(`Q${index + 1}. ${item.question}`, { size: 10.4, bold: true, color: titleColor, lineGap: 2.5 });
    drawLine(`A${index + 1}. ${item.answer}`, { size: 9.8, color: bodyColor, lineGap: 2.5 });
    addGap(4);
  });

  return Buffer.from(await pdfDoc.save());
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const user = await requireApiUser(request);
    const resume = await getResumeById(params.id);

    if (!resume) {
      return NextResponse.json({ error: "Report not found." }, { status: 404 });
    }

    if (resume.userId !== user.uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const pdf = await buildInterviewQAPdf(resume);

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="ResumeIQ-Interview-QA-${params.id}.pdf"`,
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate interview PDF.";
    const status = message === "Unauthorized" ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
