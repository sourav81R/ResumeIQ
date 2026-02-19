import { getAdminStorage, getStorageBucketCandidates } from "@/lib/firebase-admin";
import { parseResumeBuffer } from "@/lib/resumeParser";

type ResumeDocData = {
  filePath?: unknown;
  fileName?: unknown;
  fileType?: unknown;
  bucketName?: unknown;
  resumeText?: unknown;
  formattingScore?: unknown;
};

export async function resolveResumeTextAndFormatting(resumeData: ResumeDocData) {
  const filePath = String(resumeData.filePath || "");
  const fileName = String(resumeData.fileName || "resume.pdf");
  const fileType = String(resumeData.fileType || "").toLowerCase();
  const resumeText = typeof resumeData.resumeText === "string" ? resumeData.resumeText : "";
  const hasStoredText = resumeText.trim().length > 0;

  if (hasStoredText) {
    return {
      text: resumeText,
      formattingScore: Number(resumeData.formattingScore || 0)
    };
  }

  if (!filePath) {
    throw new Error("Resume content missing.");
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

  return parseResumeBuffer({
    fileName,
    fileType:
      fileType === "application/pdf" ||
      fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ? fileType
        : fileName.toLowerCase().endsWith(".docx")
          ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          : "application/pdf",
    buffer: fileBuffer
  });
}
