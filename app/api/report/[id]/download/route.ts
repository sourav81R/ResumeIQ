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
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateText(text: string, maxChars: number) {
  if (text.length <= maxChars) {
    return text;
  }

  const clipped = text.slice(0, maxChars).trim();
  const lastSpace = clipped.lastIndexOf(" ");
  const safe = lastSpace > 24 ? clipped.slice(0, lastSpace) : clipped;
  return `${safe}...`;
}

function normalizeList(value: unknown, maxItems: number, maxChars = 80) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => truncateText(toPdfSafeText(item), maxChars))
    .filter(Boolean)
    .slice(0, maxItems);
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
  const margin = 34;
  const bottom = margin;
  const maxTextWidth = pageWidth - margin * 2;
  const headingColor = rgb(0.05, 0.24, 0.37);
  const bodyColor = rgb(0.1, 0.14, 0.2);
  const mutedColor = rgb(0.35, 0.39, 0.46);
  const dividerColor = rgb(0.84, 0.88, 0.92);

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let cursorY = pageHeight - margin;

  const availableLines = (lineHeight: number) => {
    return Math.max(0, Math.floor((cursorY - bottom) / lineHeight));
  };

  const drawTextBlock = (
    text: string,
    options?: {
      x?: number;
      width?: number;
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
    const width = options?.width ?? maxTextWidth;
    const x = options?.x ?? margin;
    const lines = wrapText(text, width, fontToUse, size);
    const lineHeight = size + lineGap;
    const maxLines = availableLines(lineHeight);
    if (maxLines <= 0) {
      return false;
    }
    const truncated = lines.length > maxLines;
    const drawLines = truncated ? lines.slice(0, maxLines) : lines;
    if (truncated && drawLines.length) {
      drawLines[drawLines.length - 1] = truncateText(drawLines[drawLines.length - 1], 120);
    }

    for (const line of drawLines) {
      page.drawText(line, {
        x,
        y: cursorY - size,
        size,
        font: fontToUse,
        color
      });
      cursorY -= lineHeight;
    }

    return !truncated;
  };

  const drawCentered = (
    text: string,
    options?: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb> }
  ) => {
    const size = options?.size ?? 11;
    const fontToUse = options?.bold ? boldFont : font;
    const lines = wrapText(text, maxTextWidth, fontToUse, size);
    const lineHeight = size + 2.6;
    const maxLines = availableLines(lineHeight);
    if (maxLines <= 0) {
      return false;
    }

    const truncated = lines.length > maxLines;
    const drawLines = truncated ? lines.slice(0, maxLines) : lines;
    for (const line of drawLines) {
      const width = fontToUse.widthOfTextAtSize(line, size);
      page.drawText(line, {
        x: margin + (maxTextWidth - width) / 2,
        y: cursorY - size,
        size,
        font: fontToUse,
        color: options?.color ?? bodyColor
      });
      cursorY -= lineHeight;
    }

    return !truncated;
  };

  const drawLeftRight = (
    left: string,
    right: string,
    options?: { size?: number; boldLeft?: boolean; rightColor?: ReturnType<typeof rgb> }
  ) => {
    const size = options?.size ?? 9.4;
    const leftFont = options?.boldLeft ? boldFont : font;
    const rightFont = font;
    const rightWidth = right ? rightFont.widthOfTextAtSize(right, size) : 0;
    const leftMaxWidth = right ? maxTextWidth - rightWidth - 14 : maxTextWidth;
    const leftLines = wrapText(left, Math.max(120, leftMaxWidth), leftFont, size);
    const rightLines = right ? wrapText(right, Math.min(200, maxTextWidth * 0.4), rightFont, size) : [];
    const lineHeight = size + 2.2;
    const totalLines = Math.max(leftLines.length, rightLines.length || 1);
    const maxLines = availableLines(lineHeight);
    if (maxLines <= 0) {
      return false;
    }
    const renderLines = Math.min(totalLines, maxLines);

    for (let i = 0; i < renderLines; i += 1) {
      const leftLine = leftLines[i] || "";
      const rightLine = rightLines[i] || "";
      page.drawText(leftLine, {
        x: margin,
        y: cursorY - size,
        size,
        font: leftFont,
        color: bodyColor
      });
      if (rightLine) {
        const width = rightFont.widthOfTextAtSize(rightLine, size);
        page.drawText(rightLine, {
          x: pageWidth - margin - width,
          y: cursorY - size,
          size,
          font: rightFont,
          color: options?.rightColor ?? mutedColor
        });
      }
      cursorY -= lineHeight;
    }

    return renderLines === totalLines;
  };

  const drawMetricRow = (label: string, value: string) => {
    const size = 9.3;
    const lineHeight = size + 2.3;
    if (availableLines(lineHeight) < 1) {
      return false;
    }

    page.drawText(label, {
      x: margin,
      y: cursorY - size,
      size,
      font: boldFont,
      color: bodyColor
    });
    const valueText = truncateText(value, 18);
    const valueWidth = boldFont.widthOfTextAtSize(valueText, size);
    page.drawText(valueText, {
      x: pageWidth - margin - valueWidth,
      y: cursorY - size,
      size,
      font: boldFont,
      color: headingColor
    });
    cursorY -= lineHeight;
    return true;
  };

  const drawDivider = () => {
    if (cursorY - 2 < bottom) {
      cursorY = bottom;
      return false;
    }
    const y = cursorY - 1;
    page.drawLine({
      start: { x: margin, y },
      end: { x: pageWidth - margin, y },
      color: dividerColor,
      thickness: 0.8
    });
    cursorY -= 2;
    return true;
  };

  const addGap = (height: number) => {
    if (cursorY - height < bottom) {
      cursorY = bottom;
      return false;
    }
    cursorY -= height;
    return true;
  };

  const drawSectionTitle = (title: string) => {
    if (!addGap(2)) return false;
    if (!drawTextBlock(title, { size: 10.5, lineGap: 1.8, bold: true, color: headingColor })) return false;
    if (!addGap(2)) return false;
    return drawDivider();
  };

  const missingSkills = normalizeList(resume.feedback?.missingSkills, 12, 26);
  const matchedKeywords = normalizeList(resume.feedback?.matchedKeywords, 14, 24);
  const suggestions = normalizeList(resume.feedback?.suggestions, 4, 130);
  const sectionFeedback = resume.feedback?.sectionFeedback || {
    summary: "",
    experience: "",
    skills: "",
    education: "",
    formatting: ""
  };
  const compactSectionFeedback = {
    summary: truncateText(toPdfSafeText(sectionFeedback.summary) || "N/A", 130),
    experience: truncateText(toPdfSafeText(sectionFeedback.experience) || "N/A", 130),
    skills: truncateText(toPdfSafeText(sectionFeedback.skills) || "N/A", 130),
    education: truncateText(toPdfSafeText(sectionFeedback.education) || "N/A", 130),
    formatting: truncateText(toPdfSafeText(sectionFeedback.formatting) || "N/A", 130)
  };
  const generatedLabel = new Date(resume.updatedAt || resume.createdAt).toLocaleString();
  const roleLabel = truncateText(toPdfSafeText(resume.jobRole) || "N/A", 72);

  drawCentered("ResumeIQ ATS Report", { size: 20, bold: true, color: headingColor });
  addGap(3);
  drawDivider();
  addGap(2);
  drawLeftRight(`Role: ${roleLabel}`, `Generated: ${generatedLabel}`, { size: 9.2 });
  drawMetricRow("ATS Score", `${resume.atsScore}/100`);

  if (drawSectionTitle("SCORE BREAKDOWN")) {
    drawMetricRow("Keyword Match", `${resume.keywordMatch}%`);
    drawMetricRow("Skills Match", `${resume.skillMatch}%`);
    drawMetricRow("Formatting", `${resume.formattingScore}%`);
    drawMetricRow("Experience Relevance", `${resume.experienceScore}%`);
    drawMetricRow("Education Match", `${resume.educationScore}%`);
  }

  if (drawSectionTitle("SKILL GAPS")) {
    drawTextBlock(missingSkills.join(", ") || "No major skill gaps identified.", {
      size: 9.1,
      lineGap: 2.1
    });
  }

  if (drawSectionTitle("MATCHED KEYWORDS")) {
    drawTextBlock(matchedKeywords.join(", ") || "No keyword data available.", {
      size: 9.1,
      lineGap: 2.1
    });
  }

  if (drawSectionTitle("SECTION FEEDBACK")) {
    drawTextBlock(`Summary: ${compactSectionFeedback.summary}`, { size: 9, lineGap: 2 });
    drawTextBlock(`Experience: ${compactSectionFeedback.experience}`, { size: 9, lineGap: 2 });
    drawTextBlock(`Skills: ${compactSectionFeedback.skills}`, { size: 9, lineGap: 2 });
    drawTextBlock(`Education: ${compactSectionFeedback.education}`, { size: 9, lineGap: 2 });
    drawTextBlock(`Formatting: ${compactSectionFeedback.formatting}`, { size: 9, lineGap: 2 });
  }

  if (drawSectionTitle("TOP SUGGESTIONS")) {
    if (suggestions.length) {
      for (let i = 0; i < suggestions.length; i += 1) {
        if (
          !drawTextBlock(`${i + 1}. ${suggestions[i]}`, {
            x: margin + 4,
            width: maxTextWidth - 4,
            size: 9,
            lineGap: 2.1
          })
        ) {
          break;
        }
      }
    } else {
      drawTextBlock("No suggestions available.", { size: 9.1, lineGap: 2.1 });
    }
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
