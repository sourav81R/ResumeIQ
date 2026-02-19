import {
  OptimizedResumeContent,
  ResumeEducationItem,
  ResumeExperienceItem,
  ResumeProjectItem
} from "@/types";

export function toResumeSafeText(value: unknown, fallback = "") {
  const text = String(value ?? "");
  const normalized = text
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2026]/g, "...")
    .replace(/[\u2022]/g, "-")
    .replace(/\u00A0/g, " ")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return normalized || fallback;
}

export function truncateResumeText(text: string, maxChars: number) {
  if (text.length <= maxChars) {
    return text;
  }

  const clipped = text.slice(0, maxChars).trim();
  const lastSpace = clipped.lastIndexOf(" ");
  const safe = lastSpace > 30 ? clipped.slice(0, lastSpace) : clipped;
  return `${safe}...`;
}

export function normalizePhotoDataUrl(value: unknown) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }

  const isRasterBase64 = /^data:image\/(?:png|jpeg|jpg);base64,[A-Za-z0-9+/=]+$/i.test(text);
  const isSvgDataUrl = /^data:image\/svg\+xml;(?:base64|utf8),/i.test(text);
  if (!isRasterBase64 && !isSvgDataUrl) {
    return "";
  }

  if (text.length > 350000) {
    return "";
  }

  return text;
}

function trimList(items: unknown, maxItems: number, maxChars = 60) {
  if (!Array.isArray(items)) {
    return [] as string[];
  }

  return items
    .map((item) => truncateResumeText(toResumeSafeText(item), maxChars))
    .filter(Boolean)
    .slice(0, maxItems);
}

function normalizeExperience(items: ResumeExperienceItem[]) {
  return items.slice(0, 6).map((item) => ({
    role: truncateResumeText(toResumeSafeText(item.role), 120),
    company: truncateResumeText(toResumeSafeText(item.company), 120),
    location: truncateResumeText(toResumeSafeText(item.location), 120),
    startDate: truncateResumeText(toResumeSafeText(item.startDate), 30),
    endDate: truncateResumeText(toResumeSafeText(item.endDate), 30),
    bullets: trimList(item.bullets, 8, 260)
  }));
}

function normalizeProjects(items: ResumeProjectItem[]) {
  return items.slice(0, 6).map((item) => ({
    name: truncateResumeText(toResumeSafeText(item.name), 180),
    role: truncateResumeText(toResumeSafeText(item.role), 120),
    tech: trimList(item.tech, 8, 50),
    link: truncateResumeText(toResumeSafeText(item.link), 180),
    bullets: trimList(item.bullets, 6, 240)
  }));
}

function normalizeEducation(items: ResumeEducationItem[]) {
  return items.slice(0, 4).map((item) => ({
    institution: truncateResumeText(toResumeSafeText(item.institution), 180),
    degree: truncateResumeText(toResumeSafeText(item.degree), 180),
    startDate: truncateResumeText(toResumeSafeText(item.startDate), 30),
    endDate: truncateResumeText(toResumeSafeText(item.endDate), 30),
    details: trimList(item.details, 5, 200)
  }));
}

export function compactOptimizedResumeContent(content: OptimizedResumeContent): OptimizedResumeContent {
  return {
    header: {
      name: truncateResumeText(toResumeSafeText(content.header.name, "Candidate Name"), 90),
      role: truncateResumeText(toResumeSafeText(content.header.role, "Professional"), 140),
      email: truncateResumeText(toResumeSafeText(content.header.email), 120),
      phone: truncateResumeText(toResumeSafeText(content.header.phone), 50),
      location: truncateResumeText(toResumeSafeText(content.header.location), 120),
      links: trimList(content.header.links, 6, 140),
      photoUrl: normalizePhotoDataUrl(content.header.photoUrl) || undefined
    },
    summary: truncateResumeText(toResumeSafeText(content.summary), 1800),
    skills: {
      core: trimList(content.skills.core, 20, 60),
      tools: trimList(content.skills.tools, 20, 60),
      soft: trimList(content.skills.soft, 20, 60)
    },
    experience: normalizeExperience(content.experience),
    projects: normalizeProjects(content.projects),
    education: normalizeEducation(content.education),
    certifications: trimList(content.certifications, 10, 100)
  };
}
