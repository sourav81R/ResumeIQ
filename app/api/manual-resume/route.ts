import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { ZodError } from "zod";

import { requireApiUser } from "@/lib/auth-server";
import { getAdminDb } from "@/lib/firebase-admin";
import { saveOptimizedResumeVersion } from "@/lib/optimized-resume-store";
import { getTemplateById } from "@/lib/resume-templates";
import { manualResumeCreateSchema } from "@/lib/validations";

import { buildManualResumePayload } from "./shared";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiUser(request);
    const body = await request.json();
    const { templateId, content } = manualResumeCreateSchema.parse(body);
    const template = getTemplateById(templateId);

    if (!template) {
      return NextResponse.json({ error: "Template not found." }, { status: 404 });
    }

    const now = new Date().toISOString();
    const payload = buildManualResumePayload(content);
    const resumeId = randomUUID();
    const resumeDoc = {
      id: resumeId,
      userId: user.uid,
      fileUrl: "",
      filePath: "",
      fileType: "manual",
      bucketName: "",
      fileName: payload.fileName,
      resumeText: payload.resumeText,
      jobRole: payload.role,
      atsScore: payload.scores.atsScore,
      keywordMatch: payload.scores.keywordMatch,
      skillMatch: payload.scores.skillMatch,
      formattingScore: payload.scores.formattingScore,
      experienceScore: payload.scores.experienceScore,
      educationScore: payload.scores.educationScore,
      analysisSource: "heuristic" as const,
      feedback: payload.feedback,
      createdAt: now,
      updatedAt: now
    };

    await getAdminDb().collection("resumes").doc(resumeId).set(resumeDoc);

    const optimized = await saveOptimizedResumeVersion({
      resumeId,
      userId: user.uid,
      templateId: template.id,
      templateName: template.name,
      content: payload.normalized,
      previousAtsScore: Math.max(0, payload.scores.atsScore - 8),
      improvementScore: 8,
      scores: payload.scores,
      changedLines: ["Created manually from selected template."],
      createdAt: now,
      updatedAt: now
    });

    return NextResponse.json({ resumeId, optimizedResume: optimized });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid payload." }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : "Unable to create manual resume.";
    const status = message === "Unauthorized" ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
