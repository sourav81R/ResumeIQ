import PDFDocument from "pdfkit";
import { NextRequest, NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth-server";
import { getResumeById } from "@/lib/resume-store";

export const runtime = "nodejs";

type Params = {
  params: {
    id: string;
  };
};

function buildPdf(resume: NonNullable<Awaited<ReturnType<typeof getResumeById>>>) {
  const doc = new PDFDocument({ margin: 50 });
  const chunks: Buffer[] = [];

  doc.on("data", (chunk) => chunks.push(chunk as Buffer));

  doc.fontSize(22).text("ResumeIQ ATS Report", { align: "left" });
  doc.moveDown();

  doc.fontSize(12).text(`Job Role: ${resume.jobRole}`);
  doc.text(`Generated: ${new Date(resume.updatedAt || resume.createdAt).toLocaleString()}`);
  doc.text(`ATS Score: ${resume.atsScore}/100`);
  doc.moveDown();

  doc.fontSize(14).text("Score Breakdown");
  doc.fontSize(11);
  doc.text(`- Keyword Match: ${resume.keywordMatch}%`);
  doc.text(`- Skills Match: ${resume.skillMatch}%`);
  doc.text(`- Formatting: ${resume.formattingScore}%`);
  doc.text(`- Experience Relevance: ${resume.experienceScore}%`);
  doc.text(`- Education Match: ${resume.educationScore}%`);
  doc.moveDown();

  doc.fontSize(14).text("Skill Gaps");
  doc.fontSize(11).text(resume.feedback.missingSkills.join(", ") || "No major skill gaps identified.");
  doc.moveDown();

  doc.fontSize(14).text("Matched Keywords");
  doc.fontSize(11).text(resume.feedback.matchedKeywords.join(", ") || "No keyword data available.");
  doc.moveDown();

  doc.fontSize(14).text("Section Feedback");
  doc.fontSize(11);
  doc.text(`Summary: ${resume.feedback.sectionFeedback.summary || "N/A"}`);
  doc.text(`Experience: ${resume.feedback.sectionFeedback.experience || "N/A"}`);
  doc.text(`Skills: ${resume.feedback.sectionFeedback.skills || "N/A"}`);
  doc.text(`Education: ${resume.feedback.sectionFeedback.education || "N/A"}`);
  doc.text(`Formatting: ${resume.feedback.sectionFeedback.formatting || "N/A"}`);
  doc.moveDown();

  doc.fontSize(14).text("Top Suggestions");
  doc.fontSize(11);
  if (resume.feedback.suggestions.length) {
    resume.feedback.suggestions.forEach((suggestion, index) => {
      doc.text(`${index + 1}. ${suggestion}`);
    });
  } else {
    doc.text("No suggestions available.");
  }

  doc.end();

  return new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
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
  } catch {
    return NextResponse.json({ error: "Unable to generate report" }, { status: 400 });
  }
}


