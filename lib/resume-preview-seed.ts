import { OptimizedResumeContent } from "@/types";

type ResumeSection =
  | "header"
  | "summary"
  | "experience"
  | "projects"
  | "education"
  | "skills"
  | "certifications"
  | "other";

const EMPTY_CONTENT: OptimizedResumeContent = {
  header: {
    name: "Candidate Name",
    role: "Professional",
    email: "",
    phone: "",
    location: "",
    links: []
  },
  summary: "",
  experience: [],
  education: [],
  projects: [],
  skills: {
    core: [],
    tools: [],
    soft: []
  },
  certifications: []
};

function normalizeLines(raw: string) {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    .split("\n")
    .map((line) => line.replace(/\u00A0/g, " ").replace(/[ ]{2,}/g, " ").trim())
    .filter(Boolean);
}

function unique(values: string[], max: number) {
  return Array.from(new Set(values.map((entry) => entry.trim()).filter(Boolean))).slice(0, max);
}

function detectSection(line: string): ResumeSection | null {
  const lower = line.toLowerCase();
  if (/^(summary|professional summary|profile)\b/.test(lower)) return "summary";
  if (/^(experience|work experience|employment|internship)\b/.test(lower)) return "experience";
  if (/^(projects|personal projects|academic projects)\b/.test(lower)) return "projects";
  if (/^(education|academic background)\b/.test(lower)) return "education";
  if (/^(skills|technical skills|core skills|competencies)\b/.test(lower)) return "skills";
  if (/^(certifications|certificates|licenses)\b/.test(lower)) return "certifications";
  return null;
}

function splitSections(lines: string[]) {
  const buckets: Record<ResumeSection, string[]> = {
    header: [],
    summary: [],
    experience: [],
    projects: [],
    education: [],
    skills: [],
    certifications: [],
    other: []
  };

  let current: ResumeSection = "header";
  for (const line of lines) {
    const nextSection = detectSection(line);
    if (nextSection) {
      current = nextSection;
      continue;
    }
    buckets[current].push(line);
  }

  return buckets;
}

function extractEmail(text: string) {
  return text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
}

function extractPhone(text: string) {
  return text.match(/(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}/)?.[0] || "";
}

function extractLinks(text: string) {
  return unique(
    (text.match(/\b(?:https?:\/\/|www\.)[^\s)]+/gi) || []).map((url) => url.replace(/[.,;]$/, "").trim()),
    6
  );
}

function inferName(lines: string[], fallback = "Candidate Name") {
  const firstLine = lines[0] || "";
  if (!firstLine) return fallback;
  if (firstLine.length > 70) return fallback;
  if (/@|https?:\/\//i.test(firstLine)) return fallback;
  if (/^(summary|experience|education|skills|projects)/i.test(firstLine)) return fallback;
  return firstLine;
}

function inferRole(lines: string[]) {
  const roleLine = lines.find(
    (line) =>
      /\b(developer|engineer|analyst|manager|designer|intern|specialist|consultant|architect)\b/i.test(line) &&
      line.length <= 90
  );
  return roleLine || "Professional";
}

function parseSkills(lines: string[]) {
  const merged = lines.join(" ");
  const chunks = merged.split(/[|,]/).map((entry) => entry.trim());
  const lineItems = lines
    .flatMap((line) =>
      line
        .replace(/^[-*•]\s*/, "")
        .split(/[|,]/)
        .map((entry) => entry.trim())
    )
    .filter(Boolean);
  const all = unique([...chunks, ...lineItems], 40);

  const tools = all.filter((entry) =>
    /\b(react|next|node|typescript|javascript|python|java|sql|mongodb|postgres|aws|docker|kubernetes|git|figma|excel)\b/i.test(
      entry
    )
  );
  const soft = all.filter((entry) => /\b(communication|teamwork|leadership|problem solving|collaboration)\b/i.test(entry));
  const core = all.filter((entry) => !tools.includes(entry) && !soft.includes(entry));

  return {
    core: unique(core, 20),
    tools: unique(tools, 20),
    soft: unique(soft, 20)
  };
}

function parseExperience(lines: string[]) {
  const entries: OptimizedResumeContent["experience"] = [];
  let current: OptimizedResumeContent["experience"][number] | null = null;

  const pushCurrent = () => {
    if (!current) return;
    if (!current.company && !current.role && !current.bullets.length) return;
    entries.push({
      company: current.company,
      role: current.role,
      location: current.location,
      startDate: current.startDate,
      endDate: current.endDate,
      bullets: unique(current.bullets, 12)
    });
  };

  for (const line of lines) {
    const bullet = line.match(/^[-*•]\s*(.+)$/)?.[1]?.trim();
    if (bullet) {
      if (!current) current = { company: "", role: "", location: "", startDate: "", endDate: "", bullets: [] };
      current.bullets.push(bullet);
      continue;
    }

    const hasDate = /\b(20\d{2}|19\d{2}|present|current|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(line);
    const looksLikeTitle = /\b(intern|engineer|developer|analyst|manager|specialist|associate)\b/i.test(line);
    const looksLikeOrg = /\b(ltd|llc|inc|corp|pvt|technologies|solutions|systems|labs|university)\b/i.test(line);

    if (!current || looksLikeTitle || (looksLikeOrg && current.bullets.length > 0)) {
      pushCurrent();
      current = { company: "", role: "", location: "", startDate: "", endDate: "", bullets: [] };
      if (line.includes("|")) {
        const [left, right] = line.split("|").map((entry) => entry.trim());
        current.role = left || "";
        current.company = right || "";
      } else if (line.includes(" at ")) {
        const [left, right] = line.split(/\s+at\s+/i).map((entry) => entry.trim());
        current.role = left || "";
        current.company = right || "";
      } else if (looksLikeTitle) {
        current.role = line;
      } else {
        current.company = line;
      }
      continue;
    }

    if (hasDate && current) {
      const dateRange = line.split(/-|to/i).map((entry) => entry.trim());
      current.startDate = dateRange[0] || current.startDate;
      current.endDate = dateRange[1] || current.endDate;
      continue;
    }

    if (current && !current.location) {
      current.location = line;
      continue;
    }
  }

  pushCurrent();
  return entries.slice(0, 12);
}

function parseProjects(lines: string[]) {
  const entries: OptimizedResumeContent["projects"] = [];
  let current: OptimizedResumeContent["projects"][number] | null = null;

  const pushCurrent = () => {
    if (!current) return;
    if (!current.name && !current.bullets.length && !current.tech.length) return;
    entries.push({
      name: current.name,
      role: current.role,
      tech: unique(current.tech, 10),
      link: current.link,
      bullets: unique(current.bullets, 10)
    });
  };

  for (const line of lines) {
    const bullet = line.match(/^[-*•]\s*(.+)$/)?.[1]?.trim();
    if (bullet) {
      if (!current) current = { name: "", role: "", tech: [], link: "", bullets: [] };
      current.bullets.push(bullet);
      continue;
    }

    if (!current || (current.name && current.bullets.length > 0)) {
      pushCurrent();
      current = { name: "", role: "", tech: [], link: "", bullets: [] };
      if (line.includes("|")) {
        const [left, right] = line.split("|").map((entry) => entry.trim());
        current.name = left || "";
        current.role = right || "";
      } else {
        current.name = line;
      }
      continue;
    }

    if (/^tech[:\-]/i.test(line)) {
      current.tech.push(
        ...line
          .replace(/^tech[:\-]\s*/i, "")
          .split(/[|,]/)
          .map((entry) => entry.trim())
      );
      continue;
    }

    if (/^https?:\/\//i.test(line) || /^www\./i.test(line)) {
      current.link = line;
      continue;
    }
  }

  pushCurrent();
  return entries.slice(0, 12);
}

function parseEducation(lines: string[]) {
  const entries: OptimizedResumeContent["education"] = [];
  let current: OptimizedResumeContent["education"][number] | null = null;

  const pushCurrent = () => {
    if (!current) return;
    if (!current.institution && !current.degree && !current.details.length) return;
    entries.push({
      institution: current.institution,
      degree: current.degree,
      startDate: current.startDate,
      endDate: current.endDate,
      details: unique(current.details, 8)
    });
  };

  for (const line of lines) {
    const bullet = line.match(/^[-*•]\s*(.+)$/)?.[1]?.trim();
    if (bullet) {
      if (!current) current = { institution: "", degree: "", startDate: "", endDate: "", details: [] };
      current.details.push(bullet);
      continue;
    }

    const hasDate = /\b(20\d{2}|19\d{2}|present|current)\b/i.test(line);
    const hasDegree = /\b(b\.?tech|bachelor|master|m\.?tech|phd|diploma|degree|b\.?e|bsc|msc|mba)\b/i.test(line);

    if (!current || (hasDegree && current.degree)) {
      pushCurrent();
      current = { institution: "", degree: "", startDate: "", endDate: "", details: [] };
      if (hasDegree) {
        current.degree = line;
      } else {
        current.institution = line;
      }
      continue;
    }

    if (hasDate && current) {
      const range = line.split(/-|to/i).map((entry) => entry.trim());
      current.startDate = range[0] || current.startDate;
      current.endDate = range[1] || current.endDate;
      continue;
    }

    if (current && !current.institution) {
      current.institution = line;
      continue;
    }

    current?.details.push(line);
  }

  pushCurrent();
  return entries.slice(0, 8);
}

export function buildResumeContentFromText(resumeText: string, fallbackRole = "Professional"): OptimizedResumeContent {
  const text = String(resumeText || "").trim();
  if (!text) {
    return {
      ...EMPTY_CONTENT,
      header: { ...EMPTY_CONTENT.header, role: fallbackRole }
    };
  }

  const lines = normalizeLines(text);
  const sections = splitSections(lines);
  const allText = lines.join(" ");

  const headerLines = sections.header.length ? sections.header : lines.slice(0, 6);
  const summarySource = sections.summary.length ? sections.summary : sections.other.slice(0, 3);
  const summary = summarySource.join(" ").trim().slice(0, 1800);

  const skills = parseSkills(sections.skills);
  const experience = parseExperience(sections.experience);
  const projects = parseProjects(sections.projects);
  const education = parseEducation(sections.education);
  const certifications = unique(
    sections.certifications
      .map((line) => line.replace(/^[-*•]\s*/, "").trim())
      .filter(Boolean),
    12
  );

  return {
    header: {
      name: inferName(headerLines),
      role: inferRole(headerLines) || fallbackRole,
      email: extractEmail(allText),
      phone: extractPhone(allText),
      location: "",
      links: extractLinks(allText)
    },
    summary,
    experience,
    education,
    projects,
    skills,
    certifications
  };
}
