import { NextRequest, NextResponse } from "next/server";
import pdfParse from "pdf-parse";

import { requireApiUser } from "@/lib/auth-server";
import { getAdminDb } from "@/lib/firebase-admin";
import { generateJobMatch } from "@/lib/job-matching";
import { mapResumeDoc } from "@/lib/resume-store";
import { resolveResumeTextAndFormatting } from "@/lib/resume-source";

type Params = {
  params: {
    id: string;
  };
};

const MAX_JD_FILE_BYTES = 5 * 1024 * 1024;
const MIN_JD_TEXT_LENGTH = 60;
const MAX_JD_TEXT_LENGTH = 24000;

function normalizeText(value: unknown) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    .split("\n")
    .map((line) => line.replace(/\u00A0/g, " ").replace(/[ ]{2,}/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

async function extractJobDescriptionFromFile(file: File) {
  if (file.size > MAX_JD_FILE_BYTES) {
    throw new Error("Job description file must be under 5MB.");
  }

  const fileName = String(file.name || "job-description").toLowerCase();
  const fileType = String(file.type || "").toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  if (fileType === "application/pdf" || fileName.endsWith(".pdf")) {
    const parsed = await pdfParse(buffer);
    return normalizeText(parsed.text);
  }

  if (fileType === "text/plain" || fileName.endsWith(".txt")) {
    return normalizeText(buffer.toString("utf-8"));
  }

  throw new Error("Unsupported JD format. Upload PDF or TXT, or paste text.");
}

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const user = await requireApiUser(request);
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

    const formData = await request.formData();
    const pastedText = normalizeText(formData.get("jobDescription"));
    const fileInput = formData.get("jobDescriptionFile") || formData.get("file");
    const uploadedText = fileInput instanceof File ? await extractJobDescriptionFromFile(fileInput) : "";

    const jobDescriptionText = normalizeText([pastedText, uploadedText].filter(Boolean).join("\n\n"));

    if (jobDescriptionText.length < MIN_JD_TEXT_LENGTH) {
      return NextResponse.json(
        { error: "Please provide a fuller job description text or upload a clearer JD PDF/TXT." },
        { status: 400 }
      );
    }

    const parsedResume = await resolveResumeTextAndFormatting(rawData);
    const matching = await generateJobMatch({
      resumeText: parsedResume.text,
      jobDescriptionText: jobDescriptionText.slice(0, MAX_JD_TEXT_LENGTH),
      jobRole: resume.jobRole
    });

    const now = new Date().toISOString();
    const jobMatch = {
      jobDescriptionText: jobDescriptionText.slice(0, MAX_JD_TEXT_LENGTH),
      matchScore: matching.matchScore,
      missingKeywords: matching.missingKeywords,
      requiredSkillsGap: matching.requiredSkillsGap,
      improvementSuggestions: matching.improvementSuggestions,
      shortlistProbability: matching.shortlistProbability,
      interviewQA: matching.interviewQA,
      source: matching.source,
      updatedAt: now
    };

    await resumeRef.set(
      {
        jobMatch,
        updatedAt: now
      },
      { merge: true }
    );

    return NextResponse.json({ jobMatch });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to match resume with JD.";
    const status = message === "Unauthorized" ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
