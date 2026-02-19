import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { calculateATSScore } from "@/lib/atsScoring";
import { requireApiUser } from "@/lib/auth-server";
import { analyzeResumeWithAI } from "@/lib/openai";
import { getAdminDb } from "@/lib/firebase-admin";
import { calibrateBreakdownWithRole } from "@/lib/role-calibration";
import { resolveResumeTextAndFormatting } from "@/lib/resume-source";
import { analyzeSchema } from "@/lib/validations";

export const runtime = "nodejs";

function mergeUnique(first: string[], second: string[], max: number) {
  return Array.from(new Set([...first, ...second].map((entry) => String(entry || "").trim()).filter(Boolean))).slice(
    0,
    max
  );
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiUser(request);
    const body = await request.json();
    const { resumeId, jobRole } = analyzeSchema.parse(body);

    const resumeRef = getAdminDb().collection("resumes").doc(resumeId);
    const resumeSnap = await resumeRef.get();

    if (!resumeSnap.exists) {
      return NextResponse.json({ error: "Resume not found." }, { status: 404 });
    }

    const resumeData = resumeSnap.data();

    if (resumeData?.userId !== user.uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const parsedResume = await resolveResumeTextAndFormatting(resumeData || {});
    if (!parsedResume.text || parsedResume.text.trim().length < 80) {
      return NextResponse.json(
        { error: "Resume text extraction failed. Please upload a clearer PDF or DOCX resume." },
        { status: 400 }
      );
    }

    const targetRole = jobRole || String(resumeData.jobRole || "General Role");

    const aiResult = await analyzeResumeWithAI({
      resumeText: parsedResume.text,
      jobRole: targetRole,
      formattingScore: parsedResume.formattingScore
    });

    const calibrated = calibrateBreakdownWithRole({
      resumeText: parsedResume.text,
      jobRole: targetRole,
      aiBreakdown: aiResult.breakdown,
      baselineFormattingScore: parsedResume.formattingScore
    });
    const scoreBreakdown = calibrated.breakdown;

    const atsScore = calculateATSScore(scoreBreakdown);

    const updatedData = {
      jobRole: targetRole,
      resumeText: parsedResume.text,
      atsScore,
      keywordMatch: scoreBreakdown.keywordMatch,
      skillMatch: scoreBreakdown.skillMatch,
      formattingScore: scoreBreakdown.formattingScore,
      experienceScore: scoreBreakdown.experienceScore,
      educationScore: scoreBreakdown.educationScore,
      analysisSource: aiResult.source,
      feedback: {
        missingSkills: mergeUnique(aiResult.missingSkills, calibrated.missingSkills, 20),
        matchedKeywords: mergeUnique(aiResult.matchedKeywords, calibrated.matchedKeywords, 30),
        suggestions: aiResult.suggestions,
        sectionFeedback: aiResult.sectionFeedback
      },
      updatedAt: new Date().toISOString()
    };

    await resumeRef.set(updatedData, { merge: true });

    return NextResponse.json({
      resumeId,
      ...updatedData
    });
  } catch (error) {
    if (error instanceof ZodError) {
      const firstIssue = error.issues[0];
      const issuePath = firstIssue?.path?.join(".") || "analysis";
      return NextResponse.json(
        { error: `${issuePath}: ${firstIssue?.message || "Invalid AI response format."}` },
        { status: 400 }
      );
    }

    const message = error instanceof Error ? error.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}


