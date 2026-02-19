import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth-server";
import { getAdminDb, getAdminStorage, getStorageBucketCandidates } from "@/lib/firebase-admin";
import { parseResumeBuffer } from "@/lib/resumeParser";
import { EMPTY_FEEDBACK } from "@/lib/resume-store";
import { uploadSchema } from "@/lib/validations";

export const runtime = "nodejs";
const PDF_MIME = "application/pdf";
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
}

function resolveResumeMimeType(fileName: string, fileType: string) {
  const lowerName = fileName.toLowerCase();
  const normalizedType = String(fileType || "").trim().toLowerCase();
  const extensionType = lowerName.endsWith(".pdf") ? PDF_MIME : lowerName.endsWith(".docx") ? DOCX_MIME : "";
  const mimeType = normalizedType === PDF_MIME || normalizedType === DOCX_MIME ? normalizedType : "";

  if (!extensionType && !mimeType) {
    throw new Error("Unsupported file format. Please upload PDF or DOCX.");
  }

  if (extensionType && mimeType && extensionType !== mimeType) {
    throw new Error("File type mismatch. Please upload a valid PDF or DOCX file.");
  }

  return mimeType || extensionType;
}

function isMissingBucketError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  return (
    message.includes("The specified bucket does not exist") ||
    message.includes("bucket does not exist") ||
    message.includes("notFound")
  );
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiUser(request);
    const formData = await request.formData();
    const file = formData.get("file");
    const jobRole = String(formData.get("jobRole") || "");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Resume file is required." }, { status: 400 });
    }

    uploadSchema.parse({
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      jobRole
    });
    const resolvedMimeType = resolveResumeMimeType(file.name, file.type);

    const resumeId = randomUUID();
    const safeFileName = sanitizeFileName(file.name);
    const filePath = `resumes/${user.uid}/${resumeId}-${safeFileName}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const adminStorage = getAdminStorage();
    const bucketCandidates = getStorageBucketCandidates();
    let fileUrl = "";
    let bucketUsed = "";
    let resumeText = "";
    let parsedFormattingScore = 0;
    let lastError: unknown = null;

    for (const bucketName of bucketCandidates) {
      try {
        const bucket = adminStorage.bucket(bucketName);
        const uploadedFile = bucket.file(filePath);

        await uploadedFile.save(buffer, {
          contentType: resolvedMimeType,
          metadata: {
            cacheControl: "private, max-age=0"
          }
        });

        const [signedUrl] = await uploadedFile.getSignedUrl({
          action: "read",
          expires: "03-01-2500"
        });

        fileUrl = signedUrl;
        bucketUsed = bucketName;
        break;
      } catch (error) {
        lastError = error;
      }
    }

    if (!fileUrl || !bucketUsed) {
      if (!isMissingBucketError(lastError)) {
        throw lastError || new Error("Upload failed: unable to access configured storage bucket.");
      }

      // Storage is unavailable (often Spark plan restriction). Fallback to Firestore-only mode.
      const parsed = await parseResumeBuffer({
        fileName: file.name,
        fileType: resolvedMimeType,
        buffer
      });
      resumeText = parsed.text;
      parsedFormattingScore = parsed.formattingScore;
    }

    const now = new Date().toISOString();

    await getAdminDb().collection("resumes").doc(resumeId).set({
      id: resumeId,
      userId: user.uid,
      fileUrl,
      filePath,
      bucketName: bucketUsed,
      fileName: file.name,
      fileType: resolvedMimeType,
      resumeText,
      jobRole,
      atsScore: 0,
      keywordMatch: 0,
      skillMatch: 0,
      formattingScore: parsedFormattingScore,
      experienceScore: 0,
      educationScore: 0,
      feedback: EMPTY_FEEDBACK,
      createdAt: now,
      updatedAt: now
    });

    return NextResponse.json({
      resumeId,
      fileUrl,
      bucketName: bucketUsed,
      mode: bucketUsed ? "storage" : "firestore",
      jobRole
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    const normalizedMessage =
      message.includes("The specified bucket does not exist")
        ? "Firebase Storage bucket not found. Open Firebase Console > Storage > Get started (or upgrade plan), then retry."
        : message;
    return NextResponse.json({ error: normalizedMessage }, { status: 400 });
  }
}


