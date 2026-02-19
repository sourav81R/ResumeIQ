import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { calculateATSScore } from "@/lib/atsScoring";
import { requireApiUser } from "@/lib/auth-server";
import { getAdminDb, getAdminStorage, getStorageBucketCandidates } from "@/lib/firebase-admin";
import { analyzeResumeWithAI } from "@/lib/openai";
import { parseResumeBuffer } from "@/lib/resumeParser";
import { analyzeSchema } from "@/lib/validations";

export const runtime = "nodejs";

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

    const filePath = String(resumeData.filePath || "");
    const fileName = String(resumeData.fileName || "resume.pdf");
    const resumeText = typeof resumeData.resumeText === "string" ? resumeData.resumeText : "";
    const hasFirestoreFallbackText = resumeText.trim().length > 0;

    let parsedResume: { text: string; formattingScore: number };

    if (hasFirestoreFallbackText) {
      parsedResume = {
        text: resumeText,
        formattingScore: Number(resumeData.formattingScore || 0)
      };
    } else {
      if (!filePath) {
        return NextResponse.json({ error: "Resume content missing." }, { status: 400 });
      }

      const preferredBucket = resumeData?.bucketName ? String(resumeData.bucketName) : "";
      const bucketCandidates = [
        ...(preferredBucket ? [preferredBucket] : []),
        ...getStorageBucketCandidates()
      ].filter((value, index, array) => value && array.indexOf(value) === index);

      let fileBuffer: Buffer | null = null;
      let lastError: unknown = null;

      for (const bucketName of bucketCandidates) {
        try {
          const bucket = getAdminStorage().bucket(bucketName);
          const [downloaded] = await bucket.file(filePath).download();
          fileBuffer = downloaded;
          break;
        } catch (error) {
          lastError = error;
        }
      }

      if (!fileBuffer) {
        throw lastError || new Error("Unable to read resume file from storage bucket.");
      }

      parsedResume = await parseResumeBuffer({
        fileName,
        fileType: fileName.toLowerCase().endsWith(".docx")
          ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          : "application/pdf",
        buffer: fileBuffer
      });
    }

    const targetRole = jobRole || String(resumeData.jobRole || "General Role");

    const aiResult = await analyzeResumeWithAI({
      resumeText: parsedResume.text,
      jobRole: targetRole,
      formattingScore: parsedResume.formattingScore
    });

    const scoreBreakdown = {
      keywordMatch: aiResult.breakdown.keywordMatch,
      skillMatch: aiResult.breakdown.skillMatch,
      formattingScore: aiResult.breakdown.formattingScore,
      experienceScore: aiResult.breakdown.experienceScore,
      educationScore: aiResult.breakdown.educationScore
    };

    const atsScore = calculateATSScore(scoreBreakdown);

    const updatedData = {
      jobRole: targetRole,
      atsScore,
      keywordMatch: scoreBreakdown.keywordMatch,
      skillMatch: scoreBreakdown.skillMatch,
      formattingScore: scoreBreakdown.formattingScore,
      experienceScore: scoreBreakdown.experienceScore,
      educationScore: scoreBreakdown.educationScore,
      feedback: {
        missingSkills: aiResult.missingSkills,
        matchedKeywords: aiResult.matchedKeywords,
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


