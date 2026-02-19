import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { requireApiUser } from "@/lib/auth-server";
import { getAdminDb } from "@/lib/firebase-admin";
import { listOptimizedResumesForResume, saveOptimizedResumeVersion } from "@/lib/optimized-resume-store";
import { generateOptimizedResumeWithAI } from "@/lib/resume-optimizer";
import { getTemplateById } from "@/lib/resume-templates";
import { resolveResumeTextAndFormatting } from "@/lib/resume-source";
import { mapResumeDoc } from "@/lib/resume-store";
import { optimizeResumeSchema } from "@/lib/validations";

type Params = {
  params: {
    id: string;
  };
};

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const user = await requireApiUser(request);
    const versions = await listOptimizedResumesForResume(params.id, user.uid);
    return NextResponse.json({ versions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const user = await requireApiUser(request);
    const body = await request.json();
    const { templateId } = optimizeResumeSchema.parse(body);

    const template = getTemplateById(templateId);
    if (!template) {
      return NextResponse.json({ error: "Invalid template selected." }, { status: 400 });
    }

    const resumeRef = getAdminDb().collection("resumes").doc(params.id);
    const resumeSnap = await resumeRef.get();

    if (!resumeSnap.exists) {
      return NextResponse.json({ error: "Resume not found." }, { status: 404 });
    }

    const rawData = resumeSnap.data() || {};
    const resume = mapResumeDoc(resumeSnap.id, rawData);

    if (resume.userId !== user.uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const parsedResume = await resolveResumeTextAndFormatting(rawData);
    const now = new Date().toISOString();

    // Ensure parsed text is persisted for future comparison and optimization.
    await resumeRef.set(
      {
        resumeText: parsedResume.text,
        updatedAt: now
      },
      { merge: true }
    );

    const optimized = await generateOptimizedResumeWithAI({
      resumeText: parsedResume.text,
      jobRole: resume.jobRole,
      currentAtsScore: resume.atsScore,
      feedback: resume.feedback,
      template
    });

    const saved = await saveOptimizedResumeVersion({
      resumeId: resume.id,
      userId: user.uid,
      templateId: template.id,
      templateName: template.name,
      content: optimized.content,
      previousAtsScore: resume.atsScore,
      improvementScore: optimized.improvementScore,
      scores: optimized.scores,
      changedLines: optimized.changedLines,
      createdAt: now,
      updatedAt: now
    });

    return NextResponse.json({ optimizedResume: saved });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid input." }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : "Unable to optimize resume.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
