import { NextRequest, NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth-server";
import { getAdminDb, getAdminStorage, getStorageBucketCandidates } from "@/lib/firebase-admin";
import { deleteOptimizedResumesForResume } from "@/lib/optimized-resume-store";
import { getResumeById } from "@/lib/resume-store";

export const runtime = "nodejs";

type Params = {
  params: {
    id: string;
  };
};

function isIgnorableStorageDeleteError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  const normalized = message.toLowerCase();
  return (
    normalized.includes("no such object") ||
    normalized.includes("not found") ||
    normalized.includes("bucket does not exist") ||
    normalized.includes("specified bucket does not exist")
  );
}

async function deleteResumeFile(
  filePath: string | undefined,
  bucketName: string | undefined
) {
  if (!filePath) {
    return;
  }

  const candidates = new Set<string>();
  if (bucketName) {
    candidates.add(bucketName);
  }
  for (const candidate of getStorageBucketCandidates()) {
    candidates.add(candidate);
  }

  if (candidates.size === 0) {
    return;
  }

  const adminStorage = getAdminStorage();
  let lastError: unknown = null;

  for (const candidate of candidates) {
    try {
      await adminStorage.bucket(candidate).file(filePath).delete({ ignoreNotFound: true });
      return;
    } catch (error) {
      lastError = error;
      if (isIgnorableStorageDeleteError(error)) {
        continue;
      }
      break;
    }
  }

  if (lastError && !isIgnorableStorageDeleteError(lastError)) {
    throw lastError;
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const user = await requireApiUser(request);
    const resume = await getResumeById(params.id);

    if (!resume) {
      return NextResponse.json({ error: "Report not found." }, { status: 404 });
    }

    if (resume.userId !== user.uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await deleteOptimizedResumesForResume(resume.id, user.uid);
    await getAdminDb().collection("resumes").doc(resume.id).delete();

    try {
      await deleteResumeFile(resume.filePath, resume.bucketName);
    } catch (error) {
      console.warn("Report deleted but file cleanup failed.", error);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete report.";
    const status = message === "Unauthorized" ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
