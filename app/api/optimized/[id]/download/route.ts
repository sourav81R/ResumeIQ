import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, PDFFont, StandardFonts, rgb } from "pdf-lib";

import { requireApiUser } from "@/lib/auth-server";
import { compactOptimizedResumeContent } from "@/lib/optimized-resume-render";
import { getOptimizedResumeById } from "@/lib/optimized-resume-store";
import { RESUME_LAYOUT, resumeContentWidth } from "@/lib/resume-layout";
import { getTemplateById } from "@/lib/resume-templates";

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

async function buildPdf(version: NonNullable<Awaited<ReturnType<typeof getOptimizedResumeById>>>) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const template = getTemplateById(version.templateId);
  const accent = parseHexAccent(template?.accent || "#0e7490");
  const textColor = rgb(0.12, 0.15, 0.22);
  const mutedColor = rgb(0.35, 0.39, 0.46);
  const dividerColor = rgb(0.84, 0.88, 0.92);

  const content = compactOptimizedResumeContent(version.content);
  const pageWidth = RESUME_LAYOUT.pageWidth;
  const pageHeight = RESUME_LAYOUT.pageHeight;
  const margin = RESUME_LAYOUT.margin;
  const bottom = margin;
  const maxWidth = resumeContentWidth();

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const newPage = () => {
    page = pdfDoc.addPage([pageWidth, pageHeight]);
    y = pageHeight - margin;
  };

  const ensureSpace = (height: number) => {
    if (y - height < bottom) {
      newPage();
    }
  };

  const gap = (value: number) => {
    ensureSpace(value);
    y -= value;
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
    if (!text.trim()) return;

    const size = options?.size ?? RESUME_LAYOUT.font.body;
    const lineGap = options?.lineGap ?? RESUME_LAYOUT.lineGap.body;
    const fontToUse = options?.bold ? bold : font;
    const width = options?.width ?? maxWidth;
    const x = options?.x ?? margin;
    const lines = wrapText(text, width, fontToUse, size);
    const lineHeight = size + lineGap;

    for (const line of lines) {
      ensureSpace(lineHeight);
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

  const drawLeftRight = (left: string, right: string, size: number, isBold = false) => {
    const fontToUse = isBold ? bold : font;
    const rightWidth = right ? fontToUse.widthOfTextAtSize(right, size) : 0;
    const leftWidthMax = right ? maxWidth - rightWidth - 12 : maxWidth;
    const leftLines = wrapText(left, Math.max(120, leftWidthMax), fontToUse, size);
    const rightLines = right ? wrapText(right, Math.min(190, maxWidth * 0.34), fontToUse, size) : [];
    const lineHeight = size + RESUME_LAYOUT.lineGap.tight;
    const lineCount = Math.max(leftLines.length, rightLines.length || 1);

    for (let i = 0; i < lineCount; i += 1) {
      ensureSpace(lineHeight);
      const leftLine = leftLines[i] || "";
      const rightLine = rightLines[i] || "";
      page.drawText(leftLine, {
        x: margin,
        y: y - size,
        size,
        font: fontToUse,
        color: textColor
      });
      if (rightLine) {
        const lineWidth = fontToUse.widthOfTextAtSize(rightLine, size);
        page.drawText(rightLine, {
          x: pageWidth - margin - lineWidth,
          y: y - size,
          size,
          font: fontToUse,
          color: mutedColor
        });
      }
      y -= lineHeight;
    }
  };

  const drawDivider = () => {
    ensureSpace(3);
    const lineY = y - 1;
    page.drawLine({
      start: { x: margin, y: lineY },
      end: { x: pageWidth - margin, y: lineY },
      color: dividerColor,
      thickness: 0.8
    });
    y -= 2;
  };

  const drawSectionTitle = (title: string) => {
    gap(3);
    ensureSpace(18);
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

  const showPhotoSlot = template?.photoMode === "with-photo" || Boolean(content.header.photoUrl);
  const headerTop = y;
  let photoBottom = headerTop;
  const headerTextWidth = showPhotoSlot
    ? maxWidth - RESUME_LAYOUT.photoSize - RESUME_LAYOUT.headerGap
    : maxWidth;

  ensureSpace(showPhotoSlot ? 96 : 78);

  if (showPhotoSlot) {
    const photoX = pageWidth - margin - RESUME_LAYOUT.photoSize;
    const photoY = headerTop - RESUME_LAYOUT.photoSize + 1;
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
            width: RESUME_LAYOUT.photoSize,
            height: RESUME_LAYOUT.photoSize
          });
        } catch {
          // Keep empty frame if image decode fails.
        }
      }
    }

    page.drawRectangle({
      x: photoX,
      y: photoY,
      width: RESUME_LAYOUT.photoSize,
      height: RESUME_LAYOUT.photoSize,
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
      const dates = [exp.startDate, exp.endDate].filter(Boolean).join(" - ");
      const line = [exp.role, exp.company].filter(Boolean).join(" | ") || "Role | Company";
      drawLeftRight(line, dates, 9.4, true);
      if (exp.location) {
        drawWrapped(exp.location, { size: RESUME_LAYOUT.font.meta, color: mutedColor, lineGap: RESUME_LAYOUT.lineGap.meta });
      }
      for (const bullet of exp.bullets) {
        drawWrapped(`• ${bullet}`, {
          x: margin + 7,
          width: maxWidth - 7,
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
        drawWrapped(`• ${bullet}`, {
          x: margin + 7,
          width: maxWidth - 7,
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
      const dates = [edu.startDate, edu.endDate].filter(Boolean).join(" - ");
      const line = [edu.degree, edu.institution].filter(Boolean).join(" | ") || "Degree | Institution";
      drawLeftRight(line, dates, 9.3, true);
      for (const detail of edu.details) {
        drawWrapped(`• ${detail}`, {
          x: margin + 7,
          width: maxWidth - 7,
          size: 8.8,
          lineGap: RESUME_LAYOUT.lineGap.meta
        });
      }
      gap(1.8);
    }
  }

  if (content.certifications.length) {
    drawSectionTitle("CERTIFICATIONS");
    drawWrapped(content.certifications.join(", "), { size: 9, lineGap: RESUME_LAYOUT.lineGap.tight });
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
        "Content-Disposition": `attachment; filename=\"ResumeIQ-Optimized-${params.id}.pdf\"`
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to export optimized resume.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
