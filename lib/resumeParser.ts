import pdfParse from "pdf-parse";
import mammoth from "mammoth";

const sectionRegex =
  /\b(summary|professional summary|experience|work experience|education|skills|technical skills|projects|certifications)\b/gi;

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function inferFormattingScore(text: string) {
  const sectionMatches = text.match(sectionRegex)?.length ?? 0;
  const bulletCount = (text.match(/(?:\u2022|•|-|\*)\s+/g) || []).length;
  const lineCount = text.split(/\r?\n/).length;

  let score = 35;
  score += Math.min(sectionMatches * 8, 30);
  score += Math.min(bulletCount * 2, 20);
  score += lineCount > 40 ? 10 : 0;
  score += lineCount < 8 ? -20 : 0;

  return clamp(score);
}

function normalizeResumeText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    .split("\n")
    .map((line) => line.replace(/\u00A0/g, " ").replace(/[ ]{2,}/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .trim();
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

  const cleanedText = normalizeResumeText(text);

  if (!cleanedText) {
    throw new Error("Could not extract text from resume.");
  }

  if (cleanedText.length < 80) {
    throw new Error("Extracted resume text is too short. Please upload a clearer PDF or DOCX.");
  }

  return {
    text: cleanedText,
    formattingScore: inferFormattingScore(text)
  };
}
