import { calculateATSScore } from "@/lib/atsScoring";
import { EMPTY_FEEDBACK } from "@/lib/resume-store";
import { compactOptimizedResumeContent } from "@/lib/optimized-resume-render";
import { OptimizedResumeContent } from "@/types";

function clampScore(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function buildResumeText(content: OptimizedResumeContent) {
  const parts: string[] = [];
  const push = (label: string, value: string) => {
    if (!value.trim()) return;
    parts.push(`${label}: ${value.trim()}`);
  };

  push("Name", content.header.name);
  push("Role", content.header.role);
  push("Email", content.header.email);
  push("Phone", content.header.phone);
  push("Location", content.header.location);

  if (content.header.links.length) {
    parts.push(`Links: ${content.header.links.join(", ")}`);
  }

  if (content.summary) {
    parts.push(`Summary: ${content.summary}`);
  }

  if (content.skills.core.length || content.skills.tools.length || content.skills.soft.length) {
    parts.push(`Skills Core: ${content.skills.core.join(", ")}`);
    parts.push(`Skills Tools: ${content.skills.tools.join(", ")}`);
    parts.push(`Skills Soft: ${content.skills.soft.join(", ")}`);
  }

  content.experience.forEach((item, index) => {
    const title = [item.role, item.company].filter(Boolean).join(" - ");
    parts.push(`Experience ${index + 1}: ${title}`);
    if (item.location) parts.push(`Experience ${index + 1} Location: ${item.location}`);
    if (item.startDate || item.endDate) {
      parts.push(`Experience ${index + 1} Dates: ${[item.startDate, item.endDate].filter(Boolean).join(" to ")}`);
    }
    item.bullets.forEach((bullet) => parts.push(`Experience ${index + 1} Bullet: ${bullet}`));
  });

  content.education.forEach((item, index) => {
    const title = [item.degree, item.institution].filter(Boolean).join(" - ");
    parts.push(`Education ${index + 1}: ${title}`);
    if (item.startDate || item.endDate) {
      parts.push(`Education ${index + 1} Dates: ${[item.startDate, item.endDate].filter(Boolean).join(" to ")}`);
    }
    item.details.forEach((detail) => parts.push(`Education ${index + 1} Detail: ${detail}`));
  });

  content.projects.forEach((item, index) => {
    const title = [item.name, item.role].filter(Boolean).join(" - ");
    parts.push(`Project ${index + 1}: ${title}`);
    if (item.tech.length) parts.push(`Project ${index + 1} Tech: ${item.tech.join(", ")}`);
    if (item.link) parts.push(`Project ${index + 1} Link: ${item.link}`);
    item.bullets.forEach((bullet) => parts.push(`Project ${index + 1} Bullet: ${bullet}`));
  });

  if (content.certifications.length) {
    parts.push(`Certifications: ${content.certifications.join(", ")}`);
  }

  return parts.join("\n");
}

function deriveManualScores(content: OptimizedResumeContent) {
  const skillCount = content.skills.core.length + content.skills.tools.length + content.skills.soft.length;
  const experienceCount = content.experience.length;
  const experienceBulletCount = content.experience.reduce((sum, item) => sum + item.bullets.length, 0);
  const educationCount = content.education.length;
  const projectCount = content.projects.length;
  const hasSummary = Boolean(content.summary.trim());

  const keywordMatch = clampScore(45 + skillCount * 1.6 + (hasSummary ? 10 : 0));
  const skillMatch = clampScore(40 + skillCount * 1.9 + experienceCount * 3);
  const formattingScore = clampScore(74 + (content.header.name ? 4 : 0) + (content.header.email ? 4 : 0) + projectCount * 2);
  const experienceScore = clampScore(35 + experienceCount * 9 + experienceBulletCount * 2.2);
  const educationScore = clampScore(40 + educationCount * 18);
  const atsScore = calculateATSScore({
    keywordMatch,
    skillMatch,
    formattingScore,
    experienceScore,
    educationScore
  });

  return {
    atsScore,
    keywordMatch,
    skillMatch,
    formattingScore,
    experienceScore,
    educationScore
  };
}

function createManualFeedback(content: OptimizedResumeContent) {
  const suggestions: string[] = [];

  if (!content.summary.trim()) {
    suggestions.push("Add a concise professional summary to improve recruiter scanability.");
  }
  if (!content.experience.length || content.experience.every((item) => item.bullets.length === 0)) {
    suggestions.push("Add measurable impact bullets under experience for stronger ATS signals.");
  }
  if (content.skills.core.length + content.skills.tools.length + content.skills.soft.length < 6) {
    suggestions.push("Expand your skill sections with role-specific keywords.");
  }
  if (!content.projects.length) {
    suggestions.push("Include at least one project to strengthen practical evidence.");
  }

  if (!suggestions.length) {
    suggestions.push("Your manual resume has strong structure. Keep bullets concise and measurable.");
    suggestions.push("Tailor skills and summary keywords for each target role.");
    suggestions.push("Review role-specific accomplishments before each application.");
  }

  return {
    ...EMPTY_FEEDBACK,
    suggestions: suggestions.slice(0, 6),
    sectionFeedback: {
      summary: content.summary ? "Summary included." : "Summary is missing.",
      experience: content.experience.length ? "Experience section included." : "Experience section is missing.",
      skills:
        content.skills.core.length + content.skills.tools.length + content.skills.soft.length > 0
          ? "Skills section included."
          : "Skills section is missing.",
      education: content.education.length ? "Education section included." : "Education section is missing.",
      formatting: "Template-based formatting applied."
    }
  };
}

export function normalizeManualResumeContent(content: OptimizedResumeContent) {
  return compactOptimizedResumeContent(content);
}

export function buildManualResumePayload(content: OptimizedResumeContent) {
  const normalized = normalizeManualResumeContent(content);
  const scores = deriveManualScores(normalized);
  const feedback = createManualFeedback(normalized);
  const resumeText = buildResumeText(normalized);
  const role = normalized.header.role || "Manual Resume";
  const baseName = normalized.header.name || "Candidate";
  const safeName = baseName.replace(/[^\w\s-]/g, "").trim() || "Candidate";
  const fileName = `${safeName} Manual Resume`;

  return {
    normalized,
    scores,
    feedback,
    resumeText,
    role,
    fileName
  };
}
