import { getAdminDb } from "@/lib/firebase-admin";
import { JobMatchResult, ResumeFeedback, ResumeRecord } from "@/types";

export const EMPTY_FEEDBACK: ResumeFeedback = {
  missingSkills: [],
  matchedKeywords: [],
  suggestions: [],
  sectionFeedback: {
    summary: "",
    experience: "",
    skills: "",
    education: "",
    formatting: ""
  }
};

function normalizeFeedback(rawFeedback: unknown): ResumeFeedback {
  if (!rawFeedback || typeof rawFeedback !== "object") {
    return EMPTY_FEEDBACK;
  }

  const feedback = rawFeedback as Record<string, unknown>;
  const sectionFeedback =
    feedback.sectionFeedback && typeof feedback.sectionFeedback === "object"
      ? (feedback.sectionFeedback as Record<string, unknown>)
      : {};

  const normalizeList = (value: unknown) =>
    Array.isArray(value)
      ? value
          .map((item) => (typeof item === "string" ? item.trim() : ""))
          .filter((item) => item.length > 0)
      : [];

  return {
    missingSkills: normalizeList(feedback.missingSkills),
    matchedKeywords: normalizeList(feedback.matchedKeywords),
    suggestions: normalizeList(feedback.suggestions),
    sectionFeedback: {
      summary: typeof sectionFeedback.summary === "string" ? sectionFeedback.summary : "",
      experience: typeof sectionFeedback.experience === "string" ? sectionFeedback.experience : "",
      skills: typeof sectionFeedback.skills === "string" ? sectionFeedback.skills : "",
      education: typeof sectionFeedback.education === "string" ? sectionFeedback.education : "",
      formatting: typeof sectionFeedback.formatting === "string" ? sectionFeedback.formatting : ""
    }
  };
}

function normalizeJobMatch(rawJobMatch: unknown): JobMatchResult | undefined {
  if (!rawJobMatch || typeof rawJobMatch !== "object") {
    return undefined;
  }

  const jobMatch = rawJobMatch as Record<string, unknown>;

  const toScore = (value: unknown) => {
    const numeric = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(numeric)) return 0;
    return Math.max(0, Math.min(100, Math.round(numeric)));
  };

  const normalizeList = (value: unknown, max: number) =>
    Array.isArray(value)
      ? value
          .map((item) => (typeof item === "string" ? item.trim() : ""))
          .filter((item) => item.length > 0)
          .slice(0, max)
      : [];

  const interviewQA = Array.isArray(jobMatch.interviewQA)
    ? jobMatch.interviewQA
        .map((entry) => {
          const row = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
          const question = typeof row.question === "string" ? row.question.trim() : "";
          const answer = typeof row.answer === "string" ? row.answer.trim() : "";
          if (!question || !answer) return null;
          return { question, answer };
        })
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
        .slice(0, 20)
    : [];

  const source =
    jobMatch.source === "gemini" ||
    jobMatch.source === "openai" ||
    jobMatch.source === "heuristic" ||
    jobMatch.source === "unknown"
      ? jobMatch.source
      : "unknown";

  return {
    jobDescriptionText: typeof jobMatch.jobDescriptionText === "string" ? jobMatch.jobDescriptionText : "",
    matchScore: toScore(jobMatch.matchScore),
    missingKeywords: normalizeList(jobMatch.missingKeywords, 25),
    requiredSkillsGap: normalizeList(jobMatch.requiredSkillsGap, 25),
    improvementSuggestions: normalizeList(jobMatch.improvementSuggestions, 12),
    shortlistProbability: toScore(jobMatch.shortlistProbability),
    interviewQA,
    source,
    updatedAt: typeof jobMatch.updatedAt === "string" ? jobMatch.updatedAt : new Date().toISOString()
  };
}

export function mapResumeDoc(id: string, raw: Record<string, unknown>): ResumeRecord {
  return {
    id,
    userId: String(raw.userId || ""),
    fileUrl: String(raw.fileUrl || ""),
    filePath: String(raw.filePath || ""),
    fileType: raw.fileType ? String(raw.fileType) : undefined,
    bucketName: raw.bucketName ? String(raw.bucketName) : undefined,
    fileName: String(raw.fileName || "resume"),
    resumeText: typeof raw.resumeText === "string" ? raw.resumeText : undefined,
    jobRole: String(raw.jobRole || "Unknown Role"),
    atsScore: Number(raw.atsScore || 0),
    keywordMatch: Number(raw.keywordMatch || 0),
    skillMatch: Number(raw.skillMatch || 0),
    formattingScore: Number(raw.formattingScore || 0),
    experienceScore: Number(raw.experienceScore || 0),
    educationScore: Number(raw.educationScore || 0),
    analysisSource:
      raw.analysisSource === "gemini" ||
      raw.analysisSource === "openai" ||
      raw.analysisSource === "heuristic" ||
      raw.analysisSource === "unknown"
        ? raw.analysisSource
        : "unknown",
    feedback: normalizeFeedback(raw.feedback),
    jobMatch: normalizeJobMatch(raw.jobMatch),
    createdAt: String(raw.createdAt || new Date().toISOString()),
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined
  };
}

export async function getUserResumes(uid: string) {
  let snapshot;
  try {
    snapshot = await getAdminDb().collection("resumes").where("userId", "==", uid).get();
  } catch (error) {
    if (error instanceof Error && error.message.includes("Missing Firebase admin credentials")) {
      return [];
    }
    throw error;
  }

  return snapshot.docs
    .map((doc) => mapResumeDoc(doc.id, doc.data()))
    .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
}

export async function getResumeById(id: string) {
  let doc;
  try {
    doc = await getAdminDb().collection("resumes").doc(id).get();
  } catch (error) {
    if (error instanceof Error && error.message.includes("Missing Firebase admin credentials")) {
      return null;
    }
    throw error;
  }

  if (!doc.exists) {
    return null;
  }

  return mapResumeDoc(doc.id, doc.data() || {});
}


