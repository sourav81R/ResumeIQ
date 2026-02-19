import { getAdminDb } from "@/lib/firebase-admin";
import {
  OptimizedResumeContent,
  OptimizedResumeScores,
  OptimizedResumeVersion,
  ResumeEducationItem,
  ResumeExperienceItem,
  ResumeProjectItem
} from "@/types";

const COLLECTION = "optimized_resumes";

function normalizeString(value: unknown, fallback = "") {
  const normalized = String(value || "").trim();
  return normalized || fallback;
}

function normalizePhotoDataUrl(value: unknown) {
  const raw = normalizeString(value);
  if (!raw) {
    return "";
  }

  if (!/^data:image\/(?:png|jpeg|jpg);base64,[A-Za-z0-9+/=]+$/i.test(raw)) {
    return "";
  }

  if (raw.length > 350000) {
    return "";
  }

  return raw;
}

function normalizeList(value: unknown, max = 10) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value
    .map((item) => normalizeString(item))
    .filter(Boolean)
    .slice(0, max);
}

function normalizeExperience(value: unknown): ResumeExperienceItem[] {
  if (!Array.isArray(value)) return [];

  return value.slice(0, 6).map((item) => {
    const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    return {
      company: normalizeString(row.company),
      role: normalizeString(row.role),
      location: normalizeString(row.location),
      startDate: normalizeString(row.startDate),
      endDate: normalizeString(row.endDate),
      bullets: normalizeList(row.bullets, 8)
    };
  });
}

function normalizeEducation(value: unknown): ResumeEducationItem[] {
  if (!Array.isArray(value)) return [];

  return value.slice(0, 4).map((item) => {
    const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    return {
      institution: normalizeString(row.institution),
      degree: normalizeString(row.degree),
      startDate: normalizeString(row.startDate),
      endDate: normalizeString(row.endDate),
      details: normalizeList(row.details, 5)
    };
  });
}

function normalizeProjects(value: unknown): ResumeProjectItem[] {
  if (!Array.isArray(value)) return [];

  return value.slice(0, 6).map((item) => {
    const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    return {
      name: normalizeString(row.name),
      role: normalizeString(row.role),
      tech: normalizeList(row.tech, 8),
      link: normalizeString(row.link),
      bullets: normalizeList(row.bullets, 6)
    };
  });
}

function normalizeContent(value: unknown): OptimizedResumeContent {
  const content = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const header =
    content.header && typeof content.header === "object"
      ? (content.header as Record<string, unknown>)
      : {};
  const skills =
    content.skills && typeof content.skills === "object"
      ? (content.skills as Record<string, unknown>)
      : {};

  return {
    header: {
      name: normalizeString(header.name),
      role: normalizeString(header.role),
      email: normalizeString(header.email),
      phone: normalizeString(header.phone),
      location: normalizeString(header.location),
      links: normalizeList(header.links, 6),
      photoUrl: normalizePhotoDataUrl(header.photoUrl) || undefined
    },
    summary: normalizeString(content.summary),
    experience: normalizeExperience(content.experience),
    education: normalizeEducation(content.education),
    projects: normalizeProjects(content.projects),
    skills: {
      core: normalizeList(skills.core, 20),
      tools: normalizeList(skills.tools, 20),
      soft: normalizeList(skills.soft, 20)
    },
    certifications: normalizeList(content.certifications, 10)
  };
}

function normalizeScores(value: unknown): OptimizedResumeScores {
  const scores = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const toNumber = (raw: unknown) => {
    const numeric = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(numeric) ? Math.max(0, Math.min(100, Math.round(numeric))) : 0;
  };

  return {
    atsScore: toNumber(scores.atsScore),
    keywordMatch: toNumber(scores.keywordMatch),
    skillMatch: toNumber(scores.skillMatch),
    formattingScore: toNumber(scores.formattingScore),
    experienceScore: toNumber(scores.experienceScore),
    educationScore: toNumber(scores.educationScore)
  };
}

export function mapOptimizedResumeDoc(
  id: string,
  raw: Record<string, unknown>
): OptimizedResumeVersion {
  return {
    id,
    resumeId: normalizeString(raw.resumeId),
    userId: normalizeString(raw.userId),
    templateId: normalizeString(raw.templateId),
    templateName: normalizeString(raw.templateName),
    content: normalizeContent(raw.content),
    previousAtsScore: Number(raw.previousAtsScore || 0),
    improvementScore: Number(raw.improvementScore || 0),
    scores: normalizeScores(raw.scores),
    changedLines: normalizeList(raw.changedLines, 20),
    createdAt: normalizeString(raw.createdAt, new Date().toISOString()),
    updatedAt: raw.updatedAt ? normalizeString(raw.updatedAt) : undefined
  };
}

export async function listOptimizedResumesForResume(resumeId: string, userId: string) {
  const snapshot = await getAdminDb()
    .collection(COLLECTION)
    .where("resumeId", "==", resumeId)
    .where("userId", "==", userId)
    .get();

  return snapshot.docs
    .map((doc) => mapOptimizedResumeDoc(doc.id, doc.data()))
    .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
}

export async function getOptimizedResumeById(id: string) {
  const doc = await getAdminDb().collection(COLLECTION).doc(id).get();
  if (!doc.exists) {
    return null;
  }

  return mapOptimizedResumeDoc(doc.id, doc.data() || {});
}

export async function saveOptimizedResumeVersion(
  payload: Omit<OptimizedResumeVersion, "id">
) {
  const ref = getAdminDb().collection(COLLECTION).doc();
  await ref.set(payload);
  return { id: ref.id, ...payload };
}

export async function updateOptimizedResumeVersion(
  id: string,
  data: Partial<Pick<OptimizedResumeVersion, "content" | "scores" | "improvementScore" | "changedLines">>
) {
  const payload: Record<string, unknown> = {
    updatedAt: new Date().toISOString()
  };

  if (data.content) {
    payload.content = data.content;
  }

  if (data.scores) {
    payload.scores = data.scores;
  }

  if (typeof data.improvementScore === "number") {
    payload.improvementScore = data.improvementScore;
  }

  if (data.changedLines) {
    payload.changedLines = data.changedLines;
  }

  await getAdminDb().collection(COLLECTION).doc(id).set(payload, { merge: true });
}
