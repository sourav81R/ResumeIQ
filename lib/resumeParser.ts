import pdfParse from "pdf-parse";
import mammoth from "mammoth";

const sectionRegex = /(summary|experience|education|skills|projects|certifications)/gi;

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function inferFormattingScore(text: string) {
  const sectionMatches = text.match(sectionRegex)?.length ?? 0;
  const bulletCount = (text.match(/[•\-*]\s+/g) || []).length;
  const lineCount = text.split(/\r?\n/).length;

  let score = 35;
  score += Math.min(sectionMatches * 8, 30);
  score += Math.min(bulletCount * 2, 20);
  score += lineCount > 40 ? 10 : 0;
  score += lineCount < 8 ? -20 : 0;

  return clamp(score);
}

export async function parseResumeBuffer(input: {
  fileName: string;
  fileType: string;
  buffer: Buffer;
}) {
  let text = "";

  if (input.fileType === "application/pdf" || input.fileName.toLowerCase().endsWith(".pdf")) {
    const parsed = await pdfParse(input.buffer);
    text = parsed.text;
  } else if (
    input.fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    input.fileName.toLowerCase().endsWith(".docx")
  ) {
    const parsed = await mammoth.extractRawText({ buffer: input.buffer });
    text = parsed.value;
  } else {
    throw new Error("Unsupported file format. Please upload PDF or DOCX.");
  }

  const cleanedText = text.replace(/\s+/g, " ").trim();

  if (!cleanedText) {
    throw new Error("Could not extract text from resume.");
  }

  return {
    text: cleanedText,
    formattingScore: inferFormattingScore(text)
  };
}


