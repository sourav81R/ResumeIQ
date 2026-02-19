import { z } from "zod";

export const atsBreakdownSchema = z.object({
  keywordMatch: z.number().min(0).max(100),
  skillMatch: z.number().min(0).max(100),
  formattingScore: z.number().min(0).max(100),
  experienceScore: z.number().min(0).max(100),
  educationScore: z.number().min(0).max(100)
});

export const aiAnalysisSchema = z.object({
  breakdown: atsBreakdownSchema,
  missingSkills: z.array(z.string()).max(20),
  matchedKeywords: z.array(z.string()).max(30),
  suggestions: z.array(z.string()).min(3).max(10),
  sectionFeedback: z.object({
    summary: z.string(),
    experience: z.string(),
    skills: z.string(),
    education: z.string(),
    formatting: z.string()
  })
});

export type ATSBreakdownInput = z.infer<typeof atsBreakdownSchema>;

export function calculateATSScore(breakdown: ATSBreakdownInput) {
  const score =
    breakdown.keywordMatch * 0.3 +
    breakdown.skillMatch * 0.25 +
    breakdown.formattingScore * 0.15 +
    breakdown.experienceScore * 0.2 +
    breakdown.educationScore * 0.1;

  return Math.round(Math.max(0, Math.min(100, score)));
}


