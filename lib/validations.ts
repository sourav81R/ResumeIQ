import { z } from "zod";

export const uploadSchema = z.object({
  jobRole: z.string().min(2, "Job role is required").max(100),
  fileName: z.string().min(1),
  fileSize: z.number().positive().max(5 * 1024 * 1024),
  fileType: z.string().max(200).optional()
});

export const analyzeSchema = z.object({
  resumeId: z.string().min(1),
  jobRole: z.string().min(2).max(100).optional()
});

export const optimizeResumeSchema = z.object({
  templateId: z.string().min(2).max(80)
});

export const resumeContentSchema = z.object({
  header: z.object({
    name: z.string(),
    role: z.string(),
    email: z.string(),
    phone: z.string(),
    location: z.string(),
    links: z.array(z.string()).max(6),
    photoUrl: z.string().max(350000).optional()
  }),
  summary: z.string(),
  experience: z
    .array(
      z.object({
        company: z.string(),
        role: z.string(),
        location: z.string(),
        startDate: z.string(),
        endDate: z.string(),
        bullets: z.array(z.string()).max(8)
      })
    )
    .max(6),
  education: z
    .array(
      z.object({
        institution: z.string(),
        degree: z.string(),
        startDate: z.string(),
        endDate: z.string(),
        details: z.array(z.string()).max(5)
      })
    )
    .max(4),
  projects: z
    .array(
      z.object({
        name: z.string(),
        role: z.string(),
        tech: z.array(z.string()).max(8),
        link: z.string().optional(),
        bullets: z.array(z.string()).max(6)
      })
    )
    .max(6),
  skills: z.object({
    core: z.array(z.string()).max(20),
    tools: z.array(z.string()).max(20),
    soft: z.array(z.string()).max(20)
  }),
  certifications: z.array(z.string()).max(10)
});

export const updateOptimizedResumeSchema = z.object({
  content: resumeContentSchema
});


