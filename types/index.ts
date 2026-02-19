export type SectionFeedback = {
  summary: string;
  experience: string;
  skills: string;
  education: string;
  formatting: string;
};

export type ResumeFeedback = {
  missingSkills: string[];
  matchedKeywords: string[];
  suggestions: string[];
  sectionFeedback: SectionFeedback;
};

export type ScoreBreakdown = {
  keywordMatch: number;
  skillMatch: number;
  formattingScore: number;
  experienceScore: number;
  educationScore: number;
};

export type AnalysisSource = "gemini" | "openai" | "heuristic" | "unknown";

export type ResumeRecord = {
  id: string;
  userId: string;
  fileUrl: string;
  filePath: string;
  fileType?: string;
  bucketName?: string;
  fileName: string;
  resumeText?: string;
  jobRole: string;
  atsScore: number;
  keywordMatch: number;
  skillMatch: number;
  formattingScore: number;
  experienceScore: number;
  educationScore: number;
  analysisSource?: AnalysisSource;
  feedback: ResumeFeedback;
  createdAt: string;
  updatedAt?: string;
};

export type UserProfile = {
  uid: string;
  name: string;
  email: string;
  photoURL: string;
  createdAt: string;
};

export type ResumeTemplate = {
  id: string;
  name: string;
  description: string;
  accent: string;
  layout: "classic" | "modern" | "minimal";
  photoMode: "with-photo" | "without-photo";
  canvaUrl: string;
  promptHint: string;
};

export type ResumeHeader = {
  name: string;
  role: string;
  email: string;
  phone: string;
  location: string;
  links: string[];
  photoUrl?: string;
};

export type ResumeExperienceItem = {
  company: string;
  role: string;
  location: string;
  startDate: string;
  endDate: string;
  bullets: string[];
};

export type ResumeEducationItem = {
  institution: string;
  degree: string;
  startDate: string;
  endDate: string;
  details: string[];
};

export type ResumeProjectItem = {
  name: string;
  role: string;
  tech: string[];
  link?: string;
  bullets: string[];
};

export type ResumeSkills = {
  core: string[];
  tools: string[];
  soft: string[];
};

export type OptimizedResumeContent = {
  header: ResumeHeader;
  summary: string;
  experience: ResumeExperienceItem[];
  education: ResumeEducationItem[];
  projects: ResumeProjectItem[];
  skills: ResumeSkills;
  certifications: string[];
};

export type OptimizedResumeScores = {
  atsScore: number;
  keywordMatch: number;
  skillMatch: number;
  formattingScore: number;
  experienceScore: number;
  educationScore: number;
};

export type OptimizedResumeVersion = {
  id: string;
  resumeId: string;
  userId: string;
  templateId: string;
  templateName: string;
  content: OptimizedResumeContent;
  previousAtsScore: number;
  improvementScore: number;
  scores: OptimizedResumeScores;
  changedLines: string[];
  createdAt: string;
  updatedAt?: string;
};

