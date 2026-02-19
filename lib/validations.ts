import { z } from "zod";

export const uploadSchema = z.object({
  jobRole: z.string().min(2, "Job role is required").max(100),
  fileName: z.string().min(1),
  fileSize: z.number().positive().max(5 * 1024 * 1024),
  fileType: z.enum([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ])
});

export const analyzeSchema = z.object({
  resumeId: z.string().min(1),
  jobRole: z.string().min(2).max(100).optional()
});


