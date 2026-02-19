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

export type ResumeRecord = {
  id: string;
  userId: string;
  fileUrl: string;
  filePath: string;
  bucketName?: string;
  fileName: string;
  jobRole: string;
  atsScore: number;
  keywordMatch: number;
  skillMatch: number;
  formattingScore: number;
  experienceScore: number;
  educationScore: number;
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

