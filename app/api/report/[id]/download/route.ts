import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, PDFFont, StandardFonts, rgb } from "pdf-lib";

import { requireApiUser } from "@/lib/auth-server";
import { getResumeById } from "@/lib/resume-store";

export const runtime = "nodejs";

type Params = {
  params: {
    id: string;
  };
};

function toPdfSafeText(value: unknown) {
  const text = String(value ?? "");
  return text
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2026]/g, "...")
    .replace(/[\u2022]/g, "-")
    .replace(/\u00A0/g, " ")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "")
    .trim();
}

function normalizeList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => toPdfSafeText(item)).filter(Boolean);
}

function wrapText(text: string, maxWidth: number, font: PDFFont, size: number) {
  const words = text.split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return [""];
  }

  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(nextLine, size);

    if (width <= maxWidth || !currentLine) {
      currentLine = nextLine;
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

async function buildPdf(resume: NonNullable<Awaited<ReturnType<typeof getResumeById>>>) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 50;
  const maxTextWidth = pageWidth - margin * 2;
  const headingColor = rgb(0.05, 0.24, 0.37);
  const bodyColor = rgb(0.1, 0.14, 0.2);

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let cursorY = pageHeight - margin;

  const ensureSpace = (requiredHeight: number) => {
    if (cursorY - requiredHeight >= margin) {
      return;
    }

    page = pdfDoc.addPage([pageWidth, pageHeight]);
    cursorY = pageHeight - margin;
  };

  const drawTextBlock = (
    text: string,
    options?: {
      size?: number;
      lineGap?: number;
      bold?: boolean;
      color?: ReturnType<typeof rgb>;
    }
  ) => {
    const size = options?.size ?? 11;
    const lineGap = options?.lineGap ?? 4;
    const fontToUse = options?.bold ? boldFont : font;
    const color = options?.color ?? bodyColor;
    const lines = wrapText(text, maxTextWidth, fontToUse, size);
    const lineHeight = size + lineGap;

    ensureSpace(lines.length * lineHeight);

    for (const line of lines) {
      page.drawText(line, {
        x: margin,
        y: cursorY - size,
        size,
        font: fontToUse,
        color
      });
      cursorY -= lineHeight;
    }
  };

  const addGap = (height: number) => {
    ensureSpace(height);
    cursorY -= height;
  };

  const missingSkills = normalizeList(resume.feedback?.missingSkills);
  const matchedKeywords = normalizeList(resume.feedback?.matchedKeywords);
  const suggestions = normalizeList(resume.feedback?.suggestions);
  const sectionFeedback = resume.feedback?.sectionFeedback || {
    summary: "",
    experience: "",
    skills: "",
    education: "",
    formatting: ""
  };

  drawTextBlock("ResumeIQ ATS Report", { size: 22, lineGap: 6, bold: true, color: headingColor });
  addGap(6);

  drawTextBlock(`Job Role: ${toPdfSafeText(resume.jobRole) || "N/A"}`, { size: 12 });
  drawTextBlock(`Generated: ${new Date(resume.updatedAt || resume.createdAt).toLocaleString()}`, { size: 12 });
  drawTextBlock(`ATS Score: ${resume.atsScore}/100`, { size: 12 });
  addGap(8);

  drawTextBlock("Score Breakdown", { size: 14, bold: true, color: headingColor });
  drawTextBlock(`- Keyword Match: ${resume.keywordMatch}%`);
  drawTextBlock(`- Skills Match: ${resume.skillMatch}%`);
  drawTextBlock(`- Formatting: ${resume.formattingScore}%`);
  drawTextBlock(`- Experience Relevance: ${resume.experienceScore}%`);
  drawTextBlock(`- Education Match: ${resume.educationScore}%`);
  addGap(8);

  drawTextBlock("Skill Gaps", { size: 14, bold: true, color: headingColor });
  drawTextBlock(missingSkills.join(", ") || "No major skill gaps identified.");
  addGap(8);

  drawTextBlock("Matched Keywords", { size: 14, bold: true, color: headingColor });
  drawTextBlock(matchedKeywords.join(", ") || "No keyword data available.");
  addGap(8);

  drawTextBlock("Section Feedback", { size: 14, bold: true, color: headingColor });
  drawTextBlock(`Summary: ${toPdfSafeText(sectionFeedback.summary) || "N/A"}`);
  drawTextBlock(`Experience: ${toPdfSafeText(sectionFeedback.experience) || "N/A"}`);
  drawTextBlock(`Skills: ${toPdfSafeText(sectionFeedback.skills) || "N/A"}`);
  drawTextBlock(`Education: ${toPdfSafeText(sectionFeedback.education) || "N/A"}`);
  drawTextBlock(`Formatting: ${toPdfSafeText(sectionFeedback.formatting) || "N/A"}`);
  addGap(8);

  drawTextBlock("Top Suggestions", { size: 14, bold: true, color: headingColor });
  if (suggestions.length) {
    suggestions.forEach((suggestion, index) => {
      drawTextBlock(`${index + 1}. ${suggestion}`);
    });
  } else {
    drawTextBlock("No suggestions available.");
  }

  return Buffer.from(await pdfDoc.save());
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const user = await requireApiUser(request);
    const resume = await getResumeById(params.id);

    if (!resume) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    if (resume.userId !== user.uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const pdf = await buildPdf(resume);

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="ResumeIQ-${params.id}.pdf"`
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate report";

    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ error: `Unable to generate report: ${message}` }, { status: 500 });
  }
}
