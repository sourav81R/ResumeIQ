import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, PDFFont, StandardFonts, rgb } from "pdf-lib";

import { requireApiUser } from "@/lib/auth-server";
import { compactOptimizedResumeContent, truncateResumeText } from "@/lib/optimized-resume-render";
import { getOptimizedResumeById } from "@/lib/optimized-resume-store";
import { RESUME_LAYOUT, resumeContentWidth } from "@/lib/resume-layout";
import { getTemplateById } from "@/lib/resume-templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = {
  params: {
    id: string;
  };
};

function wrapText(text: string, maxWidth: number, font: PDFFont, size: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    const width = font.widthOfTextAtSize(next, size);

    if (!line || width <= maxWidth) {
      line = next;
    } else {
      lines.push(line);
      line = word;
    }
  }

  if (line) {
    lines.push(line);
  }

  return lines.length ? lines : [""];
}

function decodeImageDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|jpg));base64,([A-Za-z0-9+/=]+)$/i);
  if (!match?.[1] || !match[2]) {
    return null;
  }

  const mimeType = match[1].toLowerCase();
  const bytes = Uint8Array.from(Buffer.from(match[2], "base64"));
  return { mimeType, bytes };
}

function parseHexAccent(value: string) {
  const hex = /^#[0-9a-f]{6}$/i.test(value) ? value : "#0e7490";
  return rgb(
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255
  );
}

type CompactResumeContent = ReturnType<typeof compactOptimizedResumeContent>;

function tightenContentForSinglePage(content: CompactResumeContent, level: number): CompactResumeContent {
  const limits = [
    {
      summary: 1500,
      skills: 16,
      experienceItems: 5,
      experienceBullets: 6,
      projects: 4,
      projectBullets: 4,
      educationItems: 3,
      educationDetails: 3,
      certifications: 8
    },
    {
      summary: 1100,
      skills: 12,
      experienceItems: 4,
      experienceBullets: 5,
      projects: 3,
      projectBullets: 3,
      educationItems: 3,
      educationDetails: 2,
      certifications: 6
    },
    {
      summary: 800,
      skills: 10,
      experienceItems: 4,
      experienceBullets: 4,
      projects: 3,
      projectBullets: 2,
      educationItems: 2,
      educationDetails: 2,
      certifications: 5
    },
    {
      summary: 560,
      skills: 8,
      experienceItems: 3,
      experienceBullets: 3,
      projects: 2,
      projectBullets: 2,
      educationItems: 2,
      educationDetails: 1,
      certifications: 4
    }
  ] as const;

  const cap = limits[Math.min(level, limits.length - 1)];

  return {
    ...content,
    summary: truncateResumeText(content.summary, cap.summary),
    skills: {
      core: content.skills.core.slice(0, cap.skills),
      tools: content.skills.tools.slice(0, cap.skills),
      soft: content.skills.soft.slice(0, cap.skills)
    },
    experience: content.experience.slice(0, cap.experienceItems).map((item) => ({
      ...item,
      bullets: item.bullets.slice(0, cap.experienceBullets)
    })),
    projects: content.projects.slice(0, cap.projects).map((item) => ({
      ...item,
      bullets: item.bullets.slice(0, cap.projectBullets)
    })),
    education: content.education.slice(0, cap.educationItems).map((item) => ({
      ...item,
      details: item.details.slice(0, cap.educationDetails)
    })),
    certifications: content.certifications.slice(0, cap.certifications)
  };
}

function canFitOnSinglePage(
  content: CompactResumeContent,
  scale: number,
  font: PDFFont,
  bold: PDFFont,
  showPhotoSlot: boolean
) {
  const pageHeight = RESUME_LAYOUT.pageHeight;
  const margin = RESUME_LAYOUT.margin;
  const bottom = margin;
  const maxWidth = resumeContentWidth();

  let y = pageHeight - margin;
  let overflow = false;

  const ensureSpace = (height: number) => {
    if (overflow) return false;
    if (y - height < bottom) {
      overflow = true;
      return false;
    }
    return true;
  };

  const gap = (value: number) => {
    const amount = value * scale;
    if (!ensureSpace(amount)) return;
    y -= amount;
  };

  const drawWrapped = (
    text: string,
    options?: {
      width?: number;
      size?: number;
      bold?: boolean;
      lineGap?: number;
    }
  ) => {
    if (overflow || !text.trim()) return;

    const size = (options?.size ?? RESUME_LAYOUT.font.body) * scale;
    const lineGap = (options?.lineGap ?? RESUME_LAYOUT.lineGap.body) * scale;
    const fontToUse = options?.bold ? bold : font;
    const width = options?.width ?? maxWidth;
    const lines = wrapText(text, width, fontToUse, size);
    const lineHeight = size + lineGap;

    for (const _line of lines) {
      if (!ensureSpace(lineHeight)) return;
      y -= lineHeight;
    }
  };


  const drawLeftRight = (left: string, right: string, size: number, isBold = false) => {
    if (overflow) return;

    const scaledSize = size * scale;
    const fontToUse = isBold ? bold : font;
    const rightWidth = right ? fontToUse.widthOfTextAtSize(right, scaledSize) : 0;
    const leftWidthMax = right ? maxWidth - rightWidth - 12 * scale : maxWidth;
    const leftLines = wrapText(left, Math.max(120, leftWidthMax), fontToUse, scaledSize);
    const rightLines = right ? wrapText(right, Math.min(190, maxWidth * 0.34), fontToUse, scaledSize) : [];
    const lineHeight = scaledSize + RESUME_LAYOUT.lineGap.tight * scale;
    const lineCount = Math.max(leftLines.length, rightLines.length || 1);

    for (let i = 0; i < lineCount; i += 1) {
      if (!ensureSpace(lineHeight)) return;
      y -= lineHeight;
    }
  };

  const drawDivider = () => {
    const ensureHeight = 3 * scale;
    const shrink = 2 * scale;
    if (!ensureSpace(ensureHeight)) return;
    y -= shrink;
  };

  const drawSectionTitle = (title: string) => {
    if (overflow) return;
    gap(3);
    if (!ensureSpace(18 * scale)) return;
    drawWrapped(title, {
      size: RESUME_LAYOUT.font.sectionTitle,
      bold: true,
      lineGap: RESUME_LAYOUT.lineGap.sectionTitle
    });
    gap(1);
    drawDivider();
    gap(2);
  };

  const photoSize = RESUME_LAYOUT.photoSize * scale;
  const headerGap = RESUME_LAYOUT.headerGap * scale;
  const headerTextWidth = showPhotoSlot ? maxWidth - photoSize - headerGap : maxWidth;
  const headerTop = y;

  if (!ensureSpace((showPhotoSlot ? 96 : 78) * scale)) {
    return false;
  }

  drawWrapped(content.header.name, {
    width: headerTextWidth,
    size: RESUME_LAYOUT.font.name,
    bold: true,
    lineGap: RESUME_LAYOUT.lineGap.name
  });
  drawWrapped(content.header.role, {
    width: headerTextWidth,
    size: RESUME_LAYOUT.font.role,
    lineGap: RESUME_LAYOUT.lineGap.role
  });
  drawWrapped([content.header.email, content.header.phone, content.header.location].filter(Boolean).join(" | "), {
    width: headerTextWidth,
    size: RESUME_LAYOUT.font.contact,
    lineGap: RESUME_LAYOUT.lineGap.contact
  });
  if (content.header.links.length) {
    drawWrapped(content.header.links.join(" | "), {
      width: headerTextWidth,
      size: RESUME_LAYOUT.font.link,
      lineGap: RESUME_LAYOUT.lineGap.contact
    });
  }

  if (showPhotoSlot) {
    const photoBottom = headerTop - photoSize - 3;
    y = Math.min(y, photoBottom);
  }

  gap(6);
  drawDivider();
  gap(2);

  if (content.summary) {
    drawSectionTitle("PROFESSIONAL SUMMARY");
    drawWrapped(content.summary, { size: RESUME_LAYOUT.font.body, lineGap: RESUME_LAYOUT.lineGap.body });
  }

  if (content.skills.core.length || content.skills.tools.length || content.skills.soft.length) {
    drawSectionTitle("SKILLS");
    if (content.skills.core.length) {
      drawWrapped(`Core: ${content.skills.core.join(", ")}`, {
        size: RESUME_LAYOUT.font.bodyTight,
        lineGap: RESUME_LAYOUT.lineGap.tight
      });
    }
    if (content.skills.tools.length) {
      drawWrapped(`Tools: ${content.skills.tools.join(", ")}`, {
        size: RESUME_LAYOUT.font.bodyTight,
        lineGap: RESUME_LAYOUT.lineGap.tight
      });
    }
    if (content.skills.soft.length) {
      drawWrapped(`Soft: ${content.skills.soft.join(", ")}`, {
        size: RESUME_LAYOUT.font.bodyTight,
        lineGap: RESUME_LAYOUT.lineGap.tight
      });
    }
  }

  if (content.experience.length) {
    drawSectionTitle("EXPERIENCE");
    for (const exp of content.experience) {
      const dates = [exp.startDate, exp.endDate].filter(Boolean).join(" - ");
      const line = [exp.role, exp.company].filter(Boolean).join(" | ") || "Role | Company";
      drawLeftRight(line, dates, 9.4, true);
      if (exp.location) {
        drawWrapped(exp.location, { size: RESUME_LAYOUT.font.meta, lineGap: RESUME_LAYOUT.lineGap.meta });
      }
      for (const bullet of exp.bullets) {
        drawWrapped(`- ${bullet}`, {
          width: maxWidth - 7 * scale,
          size: RESUME_LAYOUT.font.bodyTight,
          lineGap: RESUME_LAYOUT.lineGap.tight
        });
      }
      gap(2.1);
    }
  }

  if (content.projects.length) {
    drawSectionTitle("PROJECTS");
    for (const project of content.projects) {
      const title = [project.name, project.role].filter(Boolean).join(" - ") || "Project";
      drawWrapped(title, { size: 9.3, bold: true, lineGap: 2 });
      if (project.tech.length) {
        drawWrapped(`Tech Stack: ${project.tech.join(", ")}`, {
          size: RESUME_LAYOUT.font.meta,
          lineGap: RESUME_LAYOUT.lineGap.meta
        });
      }
      if (project.bullets.length) {
        drawWrapped("Project Description:", {
          size: RESUME_LAYOUT.font.meta,
          bold: true,
          lineGap: RESUME_LAYOUT.lineGap.meta
        });
      }
      for (const bullet of project.bullets) {
        drawWrapped(`- ${bullet}`, {
          width: maxWidth - 7 * scale,
          size: 9,
          lineGap: RESUME_LAYOUT.lineGap.tight
        });
      }
      if (project.link) {
        drawWrapped(`GitHub Repo: ${project.link}`, {
          size: RESUME_LAYOUT.font.meta,
          lineGap: RESUME_LAYOUT.lineGap.meta
        });
      }
      gap(2.1);
    }
  }

  if (content.education.length) {
    drawSectionTitle("EDUCATION");
    for (const edu of content.education) {
      const dates = [edu.startDate, edu.endDate].filter(Boolean).join(" - ");
      const line = [edu.degree, edu.institution].filter(Boolean).join(" | ") || "Degree | Institution";
      drawLeftRight(line, dates, 9.3, true);
      for (const detail of edu.details) {
        drawWrapped(`- ${detail}`, {
          width: maxWidth - 7 * scale,
          size: 8.8,
          lineGap: RESUME_LAYOUT.lineGap.meta
        });
      }
      gap(1.8);
    }
  }

  if (content.certifications.length) {
    drawSectionTitle("CERTIFICATIONS");
    for (const certification of content.certifications) {
      drawWrapped(`- ${certification}`, {
        width: maxWidth - 7 * scale,
        size: 9,
        lineGap: RESUME_LAYOUT.lineGap.tight
      });
    }
  }

  return !overflow;
}

async function buildPdf(version: NonNullable<Awaited<ReturnType<typeof getOptimizedResumeById>>>) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const template = getTemplateById(version.templateId);
  const accent = parseHexAccent(template?.accent || "#0e7490");
  const textColor = rgb(0.12, 0.15, 0.22);
  const mutedColor = rgb(0.35, 0.39, 0.46);
  const dividerColor = rgb(0.84, 0.88, 0.92);

  const baseContent = compactOptimizedResumeContent(version.content);
  const pageWidth = RESUME_LAYOUT.pageWidth;
  const pageHeight = RESUME_LAYOUT.pageHeight;
  const margin = RESUME_LAYOUT.margin;
  const bottom = margin;
  const maxWidth = resumeContentWidth();
  const showPhotoSlot = template?.photoMode === "with-photo" || Boolean(baseContent.header.photoUrl);
  const MIN_SCALE = 0.72;
  const SCALE_STEP = 0.02;

  const candidates: CompactResumeContent[] = [
    baseContent,
    tightenContentForSinglePage(baseContent, 0),
    tightenContentForSinglePage(baseContent, 1),
    tightenContentForSinglePage(baseContent, 2),
    tightenContentForSinglePage(baseContent, 3)
  ];

  let content = baseContent;
  let scale = 1;
  let fitted = false;

  for (const candidate of candidates) {
    for (let nextScale = 1; nextScale >= MIN_SCALE; nextScale = Number((nextScale - SCALE_STEP).toFixed(2))) {
      if (canFitOnSinglePage(candidate, nextScale, font, bold, showPhotoSlot)) {
        content = candidate;
        scale = nextScale;
        fitted = true;
        break;
      }
    }

    if (fitted) {
      break;
    }
  }

  if (!fitted) {
    content = candidates[candidates.length - 1];
    scale = MIN_SCALE;
  }

  const page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;
  let overflowed = false;

  const ensureSpace = (height: number) => {
    if (overflowed) {
      return false;
    }

    if (y - height < bottom) {
      overflowed = true;
      return false;
    }

    return true;
  };

  const gap = (value: number) => {
    const amount = value * scale;
    if (!ensureSpace(amount)) return;
    y -= amount;
  };

  const drawWrapped = (
    text: string,
    options?: {
      x?: number;
      width?: number;
      size?: number;
      bold?: boolean;
      color?: ReturnType<typeof rgb>;
      lineGap?: number;
    }
  ) => {
    if (overflowed || !text.trim()) return;

    const size = (options?.size ?? RESUME_LAYOUT.font.body) * scale;
    const lineGap = (options?.lineGap ?? RESUME_LAYOUT.lineGap.body) * scale;
    const fontToUse = options?.bold ? bold : font;
    const width = options?.width ?? maxWidth;
    const x = options?.x ?? margin;
    const lines = wrapText(text, width, fontToUse, size);
    const lineHeight = size + lineGap;

    for (const line of lines) {
      if (!ensureSpace(lineHeight)) return;
      page.drawText(line, {
        x,
        y: y - size,
        size,
        font: fontToUse,
        color: options?.color || textColor
      });
      y -= lineHeight;
    }
  };

  const drawBulletLine = (
    text: string,
    options?: {
      x?: number;
      width?: number;
      size?: number;
      color?: ReturnType<typeof rgb>;
      lineGap?: number;
    }
  ) => {
    if (overflowed || !text.trim()) return;

    const size = (options?.size ?? RESUME_LAYOUT.font.bodyTight) * scale;
    const lineGap = (options?.lineGap ?? RESUME_LAYOUT.lineGap.tight) * scale;
    const color = options?.color ?? textColor;
    const x = options?.x ?? margin;
    const width = options?.width ?? maxWidth;
    const bulletGap = 7 * scale;
    const bulletSize = Math.max(0.9, 1.25 * scale);
    const textX = x + bulletGap;
    const textWidth = Math.max(48, width - bulletGap);
    const lines = wrapText(text, textWidth, font, size);
    const lineHeight = size + lineGap;

    for (let index = 0; index < lines.length; index += 1) {
      if (!ensureSpace(lineHeight)) return;

      if (index === 0) {
        page.drawCircle({
          x: x + bulletSize,
          y: y - size * 0.42,
          size: bulletSize,
          color
        });
      }

      page.drawText(lines[index] || "", {
        x: textX,
        y: y - size,
        size,
        font,
        color
      });
      y -= lineHeight;
    }
  };

  const drawLeftRight = (left: string, right: string, size: number, isBold = false) => {
    if (overflowed) return;

    const scaledSize = size * scale;
    const fontToUse = isBold ? bold : font;
    const rightWidth = right ? fontToUse.widthOfTextAtSize(right, scaledSize) : 0;
    const leftWidthMax = right ? maxWidth - rightWidth - 12 * scale : maxWidth;
    const leftLines = wrapText(left, Math.max(120, leftWidthMax), fontToUse, scaledSize);
    const rightLines = right ? wrapText(right, Math.min(190, maxWidth * 0.34), fontToUse, scaledSize) : [];
    const lineHeight = scaledSize + RESUME_LAYOUT.lineGap.tight * scale;
    const lineCount = Math.max(leftLines.length, rightLines.length || 1);

    for (let i = 0; i < lineCount; i += 1) {
      if (!ensureSpace(lineHeight)) return;
      const leftLine = leftLines[i] || "";
      const rightLine = rightLines[i] || "";
      page.drawText(leftLine, {
        x: margin,
        y: y - scaledSize,
        size: scaledSize,
        font: fontToUse,
        color: textColor
      });
      if (rightLine) {
        const lineWidth = fontToUse.widthOfTextAtSize(rightLine, scaledSize);
        page.drawText(rightLine, {
          x: pageWidth - margin - lineWidth,
          y: y - scaledSize,
          size: scaledSize,
          font: fontToUse,
          color: mutedColor
        });
      }
      y -= lineHeight;
    }
  };

  const drawDivider = () => {
    const ensureHeight = 3 * scale;
    const shrink = 2 * scale;
    if (!ensureSpace(ensureHeight)) return;

    const lineY = y - 1;
    page.drawLine({
      start: { x: margin, y: lineY },
      end: { x: pageWidth - margin, y: lineY },
      color: dividerColor,
      thickness: Math.max(0.55, 0.8 * scale)
    });
    y -= shrink;
  };

  const drawSectionTitle = (title: string) => {
    if (overflowed) return;

    gap(3);
    if (!ensureSpace(18 * scale)) return;
    drawWrapped(title, {
      size: RESUME_LAYOUT.font.sectionTitle,
      bold: true,
      color: accent,
      lineGap: RESUME_LAYOUT.lineGap.sectionTitle
    });
    gap(1);
    drawDivider();
    gap(2);
  };

  const photoSize = RESUME_LAYOUT.photoSize * scale;
  const headerGap = RESUME_LAYOUT.headerGap * scale;
  const headerTop = y;
  let photoBottom = headerTop;
  const headerTextWidth = showPhotoSlot ? maxWidth - photoSize - headerGap : maxWidth;

  ensureSpace((showPhotoSlot ? 96 : 78) * scale);

  if (showPhotoSlot && !overflowed) {
    const photoX = pageWidth - margin - photoSize;
    const photoY = headerTop - photoSize + 1;
    photoBottom = photoY - 4;

    if (content.header.photoUrl) {
      const decoded = decodeImageDataUrl(content.header.photoUrl);
      if (decoded) {
        try {
          const embedded =
            decoded.mimeType === "image/png"
              ? await pdfDoc.embedPng(decoded.bytes)
              : await pdfDoc.embedJpg(decoded.bytes);
          page.drawImage(embedded, {
            x: photoX,
            y: photoY,
            width: photoSize,
            height: photoSize
          });
        } catch {
          // Keep empty frame if image decode fails.
        }
      }
    }

    page.drawRectangle({
      x: photoX,
      y: photoY,
      width: photoSize,
      height: photoSize,
      borderColor: dividerColor,
      borderWidth: 0.9
    });
  }

  drawWrapped(content.header.name, {
    x: margin,
    width: headerTextWidth,
    size: RESUME_LAYOUT.font.name,
    bold: true,
    color: accent,
    lineGap: RESUME_LAYOUT.lineGap.name
  });
  drawWrapped(content.header.role, {
    x: margin,
    width: headerTextWidth,
    size: RESUME_LAYOUT.font.role,
    color: textColor,
    lineGap: RESUME_LAYOUT.lineGap.role
  });
  drawWrapped([content.header.email, content.header.phone, content.header.location].filter(Boolean).join(" | "), {
    x: margin,
    width: headerTextWidth,
    size: RESUME_LAYOUT.font.contact,
    color: mutedColor,
    lineGap: RESUME_LAYOUT.lineGap.contact
  });
  if (content.header.links.length) {
    drawWrapped(content.header.links.join(" | "), {
      x: margin,
      width: headerTextWidth,
      size: RESUME_LAYOUT.font.link,
      color: mutedColor,
      lineGap: RESUME_LAYOUT.lineGap.contact
    });
  }

  if (showPhotoSlot) {
    y = Math.min(y, photoBottom);
  }

  gap(6);
  drawDivider();
  gap(2);

  if (content.summary) {
    drawSectionTitle("PROFESSIONAL SUMMARY");
    drawWrapped(content.summary, { size: RESUME_LAYOUT.font.body, lineGap: RESUME_LAYOUT.lineGap.body });
  }

  if (content.skills.core.length || content.skills.tools.length || content.skills.soft.length) {
    drawSectionTitle("SKILLS");
    if (content.skills.core.length) {
      drawWrapped(`Core: ${content.skills.core.join(", ")}`, {
        size: RESUME_LAYOUT.font.bodyTight,
        lineGap: RESUME_LAYOUT.lineGap.tight
      });
    }
    if (content.skills.tools.length) {
      drawWrapped(`Tools: ${content.skills.tools.join(", ")}`, {
        size: RESUME_LAYOUT.font.bodyTight,
        lineGap: RESUME_LAYOUT.lineGap.tight
      });
    }
    if (content.skills.soft.length) {
      drawWrapped(`Soft: ${content.skills.soft.join(", ")}`, {
        size: RESUME_LAYOUT.font.bodyTight,
        lineGap: RESUME_LAYOUT.lineGap.tight
      });
    }
  }

  if (content.experience.length) {
    drawSectionTitle("EXPERIENCE");
    for (const exp of content.experience) {
      if (overflowed) break;
      const dates = [exp.startDate, exp.endDate].filter(Boolean).join(" - ");
      const line = [exp.role, exp.company].filter(Boolean).join(" | ") || "Role | Company";
      drawLeftRight(line, dates, 9.4, true);
      if (exp.location) {
        drawWrapped(exp.location, { size: RESUME_LAYOUT.font.meta, color: mutedColor, lineGap: RESUME_LAYOUT.lineGap.meta });
      }
      for (const bullet of exp.bullets) {
        drawWrapped(`- ${bullet}`, {
          x: margin + 7 * scale,
          width: maxWidth - 7 * scale,
          size: RESUME_LAYOUT.font.bodyTight,
          lineGap: RESUME_LAYOUT.lineGap.tight
        });
      }
      gap(2.1);
    }
  }

  if (content.projects.length) {
    drawSectionTitle("PROJECTS");
    for (const project of content.projects) {
      if (overflowed) break;
      const title = [project.name, project.role].filter(Boolean).join(" - ") || "Project";
      drawWrapped(title, { size: 9.3, bold: true, lineGap: 2 });
      if (project.tech.length) {
        drawWrapped(`Tech Stack: ${project.tech.join(", ")}`, {
          size: RESUME_LAYOUT.font.meta,
          color: mutedColor,
          lineGap: RESUME_LAYOUT.lineGap.meta
        });
      }
      if (project.bullets.length) {
        drawWrapped("Project Description:", {
          size: RESUME_LAYOUT.font.meta,
          bold: true,
          color: mutedColor,
          lineGap: RESUME_LAYOUT.lineGap.meta
        });
      }
      for (const bullet of project.bullets) {
        drawWrapped(`- ${bullet}`, {
          x: margin + 7 * scale,
          width: maxWidth - 7 * scale,
          size: 9,
          lineGap: RESUME_LAYOUT.lineGap.tight
        });
      }
      if (project.link) {
        drawWrapped(`GitHub Repo: ${project.link}`, {
          size: RESUME_LAYOUT.font.meta,
          color: mutedColor,
          lineGap: RESUME_LAYOUT.lineGap.meta
        });
      }
      gap(2.1);
    }
  }

  if (content.education.length) {
    drawSectionTitle("EDUCATION");
    for (const edu of content.education) {
      if (overflowed) break;
      const dates = [edu.startDate, edu.endDate].filter(Boolean).join(" - ");
      const line = [edu.degree, edu.institution].filter(Boolean).join(" | ") || "Degree | Institution";
      drawLeftRight(line, dates, 9.3, true);
      for (const detail of edu.details) {
        drawWrapped(`- ${detail}`, {
          x: margin + 7 * scale,
          width: maxWidth - 7 * scale,
          size: 8.8,
          lineGap: RESUME_LAYOUT.lineGap.meta
        });
      }
      gap(1.8);
    }
  }

  if (content.certifications.length) {
    drawSectionTitle("CERTIFICATIONS");
    for (const certification of content.certifications) {
      drawBulletLine(certification, {
        x: margin + 7 * scale,
        width: maxWidth - 7 * scale,
        size: 9,
        lineGap: RESUME_LAYOUT.lineGap.tight
      });
    }
  }

  while (pdfDoc.getPageCount() > 1) {
    pdfDoc.removePage(pdfDoc.getPageCount() - 1);
  }

  return Buffer.from(await pdfDoc.save());
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const user = await requireApiUser(request);
    const version = await getOptimizedResumeById(params.id);

    if (!version) {
      return NextResponse.json({ error: "Optimized resume not found." }, { status: 404 });
    }

    if (version.userId !== user.uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const pdf = await buildPdf(version);
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=\"ResumeIQ-Optimized-${params.id}.pdf\"`,
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to export optimized resume.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
