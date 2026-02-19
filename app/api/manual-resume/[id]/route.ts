import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { requireApiUser } from "@/lib/auth-server";
import { getAdminDb } from "@/lib/firebase-admin";
import { getOptimizedResumeById } from "@/lib/optimized-resume-store";
import { getResumeById } from "@/lib/resume-store";
import { getTemplateById } from "@/lib/resume-templates";
import { manualResumeUpdateSchema } from "@/lib/validations";

import { buildManualResumePayload } from "../shared";

export const runtime = "nodejs";

type Params = {
  params: {
    id: string;
  };
};

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const user = await requireApiUser(request);
    const resume = await getResumeById(params.id);

    if (!resume) {
      return NextResponse.json({ error: "Resume not found." }, { status: 404 });
    }

    if (resume.userId !== user.uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { templateId, versionId, content } = manualResumeUpdateSchema.parse(body);
    const template = getTemplateById(templateId);
    if (!template) {
      return NextResponse.json({ error: "Template not found." }, { status: 404 });
    }

    const version = await getOptimizedResumeById(versionId);
    if (!version) {
      return NextResponse.json({ error: "Optimized resume version not found." }, { status: 404 });
    }
    if (version.userId !== user.uid || version.resumeId !== resume.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date().toISOString();
    const payload = buildManualResumePayload(content);
    const improvementScore = Math.max(0, payload.scores.atsScore - version.previousAtsScore);

    await getAdminDb()
      .collection("optimized_resumes")
      .doc(version.id)
      .set(
        {
          templateId: template.id,
          templateName: template.name,
          content: payload.normalized,
          scores: payload.scores,
          improvementScore,
          changedLines: ["Updated manually from resume builder."],
          updatedAt: now
        },
        { merge: true }
      );

    await getAdminDb()
      .collection("resumes")
      .doc(resume.id)
      .set(
        {
          fileName: payload.fileName,
          resumeText: payload.resumeText,
          jobRole: payload.role,
          atsScore: payload.scores.atsScore,
          keywordMatch: payload.scores.keywordMatch,
          skillMatch: payload.scores.skillMatch,
          formattingScore: payload.scores.formattingScore,
          experienceScore: payload.scores.experienceScore,
          educationScore: payload.scores.educationScore,
          analysisSource: "heuristic",
          feedback: payload.feedback,
          updatedAt: now
        },
        { merge: true }
      );

    const updated = await getOptimizedResumeById(version.id);
    if (!updated) {
      return NextResponse.json({ error: "Unable to load updated resume." }, { status: 500 });
    }

    return NextResponse.json({ resumeId: resume.id, optimizedResume: updated });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid payload." }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : "Unable to update manual resume.";
    const status = message === "Unauthorized" ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
