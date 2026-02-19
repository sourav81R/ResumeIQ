import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, PDFFont, StandardFonts, rgb } from "pdf-lib";

import { requireApiUser } from "@/lib/auth-server";
import {
  compactOptimizedResumeContent,
  truncateResumeText
} from "@/lib/optimized-resume-render";
import { getOptimizedResumeById } from "@/lib/optimized-resume-store";
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

async function buildPdf(version: NonNullable<Awaited<ReturnType<typeof getOptimizedResumeById>>>) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const template = getTemplateById(version.templateId);
  const accentHex = template?.accent || "#0e7490";
  const accent = rgb(
    parseInt(accentHex.slice(1, 3), 16) / 255,
    parseInt(accentHex.slice(3, 5), 16) / 255,
    parseInt(accentHex.slice(5, 7), 16) / 255
  );
  const textColor = rgb(0.12, 0.15, 0.22);
  const mutedColor = rgb(0.35, 0.39, 0.46);
  const dividerColor = rgb(0.84, 0.88, 0.92);

  const content = compactOptimizedResumeContent(version.content);
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 34;
  const maxWidth = pageWidth - margin * 2;
  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;
  const bottom = margin;

  const availableLines = (lineHeight: number) => {
    return Math.max(0, Math.floor((y - bottom) / lineHeight));
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
    const size = options?.size ?? 10;
    const lineGap = options?.lineGap ?? 2.8;
    const fontToUse = options?.bold ? bold : font;
    const width = options?.width ?? maxWidth;
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
      drawLines[drawLines.length - 1] = truncateResumeText(drawLines[drawLines.length - 1], 120);
    }

    for (const line of drawLines) {
      page.drawText(line, {
        x,
        y: y - size,
        size,
        font: fontToUse,
        color: options?.color || textColor
      });
      y -= lineHeight;
    }

    return !truncated;
  };

  const drawLeftRight = (left: string, right: string, size: number, isBold = false) => {
    const fontToUse = isBold ? bold : font;
    const rightWidth = right ? fontToUse.widthOfTextAtSize(right, size) : 0;
    const leftWidthMax = right ? maxWidth - rightWidth - 12 : maxWidth;
    const leftLines = wrapText(left, Math.max(120, leftWidthMax), fontToUse, size);
    const rightLines = right ? wrapText(right, Math.min(190, maxWidth * 0.34), fontToUse, size) : [];
    const lineHeight = size + 2.4;
    const neededLines = Math.max(leftLines.length, rightLines.length || 1);
    const maxLines = availableLines(lineHeight);
    if (maxLines <= 0) {
      return false;
    }

    const lines = Math.min(neededLines, maxLines);
    for (let i = 0; i < lines; i += 1) {
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

    return lines === neededLines;
  };

  const gap = (value: number) => {
    if (y - value < bottom) {
      y = bottom;
      return false;
    }
    y -= value;
    return true;
  };

  const drawDivider = () => {
    if (y - 2 < bottom) {
      return false;
    }
    const lineY = y - 1;
    page.drawLine({
      start: { x: margin, y: lineY },
      end: { x: pageWidth - margin, y: lineY },
      color: dividerColor,
      thickness: 0.8
    });
    y -= 2;
    return true;
  };

  const drawSectionTitle = (title: string) => {
    if (!gap(2)) return false;
    if (!drawWrapped(title, { size: 10.5, bold: true, color: accent, lineGap: 1.8 })) return false;
    if (!gap(2)) return false;
    return drawDivider();
  };

  const headerTop = y;
  const photoSize = 78;
  const photoGap = 16;
  let photoBottom = headerTop;
  const hasPhoto = Boolean(content.header.photoUrl);
  const showPhotoSlot = (template?.photoMode === "with-photo") || hasPhoto;
  const headerTextWidth = showPhotoSlot ? maxWidth - photoSize - photoGap : maxWidth;

  if (showPhotoSlot) {
    const photoX = pageWidth - margin - photoSize;
    const photoY = headerTop - photoSize + 1;
    photoBottom = photoY - 4;

    if (hasPhoto && content.header.photoUrl) {
      const decoded = decodeImageDataUrl(content.header.photoUrl);
      if (decoded) {
        try {
          const embedded =
            decoded.mimeType === "image/png" ? await pdfDoc.embedPng(decoded.bytes) : await pdfDoc.embedJpg(decoded.bytes);
          page.drawImage(embedded, {
            x: photoX,
            y: photoY,
            width: photoSize,
            height: photoSize
          });
        } catch {
          // If image decode fails, draw empty photo slot below.
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
    size: 18.5,
    bold: true,
    color: accent,
    lineGap: 2.5
  });
  drawWrapped(content.header.role, {
    x: margin,
    width: headerTextWidth,
    size: 10.8,
    color: textColor,
    lineGap: 2.4
  });
  drawWrapped(
    [content.header.email, content.header.phone, content.header.location]
      .filter(Boolean)
      .join("  |  "),
    {
      x: margin,
      width: headerTextWidth,
      size: 9.2,
      color: mutedColor,
      lineGap: 2.2
    }
  );
  if (content.header.links.length) {
    drawWrapped(content.header.links.join("  |  "), {
      x: margin,
      width: headerTextWidth,
      size: 8.8,
      color: mutedColor,
      lineGap: 2.1
    });
  }

  if (showPhotoSlot) {
    y = Math.min(y, photoBottom);
  }

  gap(6);
  drawDivider();

  if (content.summary) {
    if (drawSectionTitle("PROFESSIONAL SUMMARY")) {
      drawWrapped(content.summary, { size: 9.6, lineGap: 2.3 });
    }
  }

  if (content.skills.core.length || content.skills.tools.length || content.skills.soft.length) {
    if (drawSectionTitle("SKILLS")) {
      if (content.skills.core.length) {
        drawWrapped(`Core: ${content.skills.core.join(", ")}`, { size: 9.2, lineGap: 2.1 });
      }
      if (content.skills.tools.length) {
        drawWrapped(`Tools: ${content.skills.tools.join(", ")}`, { size: 9.2, lineGap: 2.1 });
      }
      if (content.skills.soft.length) {
        drawWrapped(`Soft: ${content.skills.soft.join(", ")}`, { size: 9.2, lineGap: 2.1 });
      }
    }
  }

  if (content.experience.length && drawSectionTitle("EXPERIENCE")) {
    for (const exp of content.experience) {
      const dates = [exp.startDate, exp.endDate].filter(Boolean).join(" - ");
      const mainLine = [exp.role, exp.company].filter(Boolean).join(" | ") || "Role | Company";
      if (!drawLeftRight(mainLine, dates, 9.4, true)) break;
      if (exp.location && !drawWrapped(exp.location, { size: 8.7, color: mutedColor, lineGap: 2 })) {
        break;
      }

      for (const bullet of exp.bullets) {
        if (!drawWrapped(`- ${bullet}`, { x: margin + 7, width: maxWidth - 7, size: 9.2, lineGap: 2.1 })) {
          break;
        }
      }
      if (!gap(2.2)) break;
    }
  }

  if (content.projects.length && drawSectionTitle("PROJECTS")) {
    for (const project of content.projects) {
      const title = [project.name, project.role].filter(Boolean).join(" - ") || "Project";
      if (!drawWrapped(title, { size: 9.4, bold: true, lineGap: 2 })) break;
      if (project.tech.length && !drawWrapped(`Tech: ${project.tech.join(", ")}`, { size: 8.7, color: mutedColor })) {
        break;
      }
      if (project.link && !drawWrapped(`Link: ${project.link}`, { size: 8.7, color: mutedColor })) {
        break;
      }

      for (const bullet of project.bullets) {
        if (!drawWrapped(`- ${bullet}`, { x: margin + 7, width: maxWidth - 7, size: 9.1, lineGap: 2.1 })) {
          break;
        }
      }
      if (!gap(2.2)) break;
    }
  }

  if (content.education.length && drawSectionTitle("EDUCATION")) {
    for (const edu of content.education) {
      const dates = [edu.startDate, edu.endDate].filter(Boolean).join(" - ");
      const line = [edu.degree, edu.institution].filter(Boolean).join(" | ") || "Degree | Institution";
      if (!drawLeftRight(line, dates, 9.3, true)) break;
      for (const detail of edu.details) {
        if (!drawWrapped(`- ${detail}`, { x: margin + 7, width: maxWidth - 7, size: 8.8, lineGap: 2 })) {
          break;
        }
      }
      if (!gap(1.8)) break;
    }
  }

  if (content.certifications.length && drawSectionTitle("CERTIFICATIONS")) {
    drawWrapped(content.certifications.join(", "), { size: 9.1, lineGap: 2.1 });
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
