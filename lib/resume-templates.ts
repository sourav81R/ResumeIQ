import { ResumeTemplate } from "@/types";

function buildCanvaUrl(query: string) {
  return `https://www.canva.com/templates/?query=${encodeURIComponent(`${query} resume`)}`;
}

export const RESUME_TEMPLATES: ResumeTemplate[] = [
  {
    id: "canva-blue-health-photo",
    name: "Blue Health Photo",
    description: "Canva style with profile photo block and healthcare-focused hierarchy.",
    accent: "#0b5ed7",
    layout: "modern",
    photoMode: "with-photo",
    canvaUrl: buildCanvaUrl("Blue Health Photo"),
    promptHint:
      "Include a clean profile section with a short role headline, concise summary, and measurable impact bullets."
  },
  {
    id: "canva-green-health-photo",
    name: "Green Health Photo",
    description: "Canva style with left photo column and compact clinical/professional sections.",
    accent: "#137a4b",
    layout: "classic",
    photoMode: "with-photo",
    canvaUrl: buildCanvaUrl("Green Health Photo"),
    promptHint:
      "Keep medical or service credentials clear, with a profile photo region and ATS-friendly section labels."
  },
  {
    id: "canva-mountain-photographer-photo",
    name: "Mountains Photographer Photo",
    description: "Canva creative style with photo-forward header and portfolio focus.",
    accent: "#7a4e2d",
    layout: "modern",
    photoMode: "with-photo",
    canvaUrl: buildCanvaUrl("Mountains Photographer Photo"),
    promptHint:
      "Prioritize visual-creative achievements, portfolio links, and concise project outcome bullets."
  },
  {
    id: "canva-black-yellow-photography-photo",
    name: "Black Yellow Photography Photo",
    description: "Canva high-contrast photo layout for visual and media profiles.",
    accent: "#d8a404",
    layout: "modern",
    photoMode: "with-photo",
    canvaUrl: buildCanvaUrl("Black Yellow Photography Photo"),
    promptHint:
      "Use bold but readable structure, with short bullets and portfolio-first narrative."
  },
  {
    id: "canva-orange-photo-header-customer-service",
    name: "Orange Photo Header Customer Service",
    description: "Canva style with top photo strip and service-oriented experience sections.",
    accent: "#f97316",
    layout: "classic",
    photoMode: "with-photo",
    canvaUrl: buildCanvaUrl("Orange Photo Header Customer Service"),
    promptHint:
      "Lead with customer impact, response metrics, and communication strengths in concise bullets."
  },
  {
    id: "canva-yellow-photo-header-college",
    name: "Yellow Photo Header College",
    description: "Canva student resume style with profile area and skills-first layout.",
    accent: "#ca8a04",
    layout: "minimal",
    photoMode: "with-photo",
    canvaUrl: buildCanvaUrl("Yellow Photo Header College"),
    promptHint:
      "Prioritize internships, projects, and coursework outcomes while keeping language professional."
  },
  {
    id: "canva-yellow-photographer-creative",
    name: "Yellow Photographer Creative",
    description: "Canva creative profile with photo and project-focused storytelling.",
    accent: "#eab308",
    layout: "modern",
    photoMode: "with-photo",
    canvaUrl: buildCanvaUrl("Yellow Photographer Creative"),
    promptHint:
      "Focus on creative campaign/project impact, role scope, and tools used."
  },
  {
    id: "canva-turquoise-acting-photo",
    name: "Turquoise Acting Photo",
    description: "Canva artistic style with photo section and compact credentials.",
    accent: "#0f766e",
    layout: "classic",
    photoMode: "with-photo",
    canvaUrl: buildCanvaUrl("Turquoise Drama Masks Acting"),
    promptHint:
      "Highlight performances, productions, training, and notable achievements in concise lines."
  },
  {
    id: "canva-minimal-multimedia-artist-photo",
    name: "Minimal Multimedia Artist Photo",
    description: "Canva minimal creative profile with image-led personal branding.",
    accent: "#334155",
    layout: "minimal",
    photoMode: "with-photo",
    canvaUrl: buildCanvaUrl("Minimal Multimedia Artist Photo"),
    promptHint:
      "Keep a concise artistic summary, project outcomes, and core tool stack."
  },
  {
    id: "canva-bright-pink-modern-photo",
    name: "Bright Pink Modern Photo",
    description: "Canva modern visual resume with profile image and bold accent sections.",
    accent: "#db2777",
    layout: "modern",
    photoMode: "with-photo",
    canvaUrl: buildCanvaUrl("Bright Pink Modern Photo"),
    promptHint:
      "Balance bold visual style with ATS-readable headings and result-focused bullets."
  },
  {
    id: "canva-navy-orange-simple-college",
    name: "Navy Orange Simple College",
    description: "Canva no-photo student template with structured sections and clean scanability.",
    accent: "#1d4ed8",
    layout: "minimal",
    photoMode: "without-photo",
    canvaUrl: buildCanvaUrl("Navy Blue Orange Simple College"),
    promptHint:
      "Prioritize education, projects, and internships in clear ATS-friendly wording."
  },
  {
    id: "canva-gray-minimalist",
    name: "Gray Minimalist",
    description: "Canva no-photo minimalist template for professional and technical roles.",
    accent: "#64748b",
    layout: "minimal",
    photoMode: "without-photo",
    canvaUrl: buildCanvaUrl("Gray Minimalist"),
    promptHint:
      "Keep wording direct, section labels simple, and bullets short with measurable outcomes."
  },
  {
    id: "canva-black-simple-lines-college",
    name: "Black Simple Lines College",
    description: "Canva no-photo college template with strong section separators and compact spacing.",
    accent: "#111827",
    layout: "classic",
    photoMode: "without-photo",
    canvaUrl: buildCanvaUrl("Black Simple Lines College"),
    promptHint:
      "Maintain concise academic and project highlights with action-driven bullet language."
  },
  {
    id: "canva-black-white-minimal",
    name: "Black White Minimal",
    description: "Canva no-photo high-contrast template for ATS and recruiter readability.",
    accent: "#0f172a",
    layout: "minimal",
    photoMode: "without-photo",
    canvaUrl: buildCanvaUrl("Black and White Minimal"),
    promptHint:
      "Use clean structure, no decorative language, and strong quantified achievements."
  },
  {
    id: "canva-white-minimal-academic",
    name: "White Minimal Academic",
    description: "Canva no-photo academic layout emphasizing education and research achievements.",
    accent: "#0f766e",
    layout: "classic",
    photoMode: "without-photo",
    canvaUrl: buildCanvaUrl("White Minimalist Academic"),
    promptHint:
      "Highlight education, research, publications, and relevant technical or teaching impact."
  },
  {
    id: "canva-white-coral-icons-infographic",
    name: "White Coral Icons Infographic",
    description: "Canva no-photo infographic-inspired template with strong visual section grouping.",
    accent: "#f97373",
    layout: "modern",
    photoMode: "without-photo",
    canvaUrl: buildCanvaUrl("White Coral Icons Infographic"),
    promptHint:
      "Preserve ATS clarity while emphasizing achievements and structured skill sections."
  },
  {
    id: "canva-pink-dark-blue-icons-infographic",
    name: "Pink Dark Blue Icons Infographic",
    description: "Canva no-photo modern infographic style for marketing and growth roles.",
    accent: "#1e3a8a",
    layout: "modern",
    photoMode: "without-photo",
    canvaUrl: buildCanvaUrl("Pink Dark Blue Icons Infographic"),
    promptHint:
      "Use concise impact metrics, campaign outcomes, and role ownership language."
  },
  {
    id: "canva-black-white-rainbow-infographic",
    name: "Black White Rainbow Infographic",
    description: "Canva no-photo infographic resume with balanced detail and scanable headings.",
    accent: "#4f46e5",
    layout: "modern",
    photoMode: "without-photo",
    canvaUrl: buildCanvaUrl("Black White Rainbow Infographic"),
    promptHint:
      "Keep sections compact and ATS-readable while preserving visual hierarchy through wording."
  },
  {
    id: "canva-colorful-gradient-designer",
    name: "Colorful Gradient Graphic Designer",
    description: "Canva no-photo designer template with modern gradient visual direction.",
    accent: "#0ea5e9",
    layout: "modern",
    photoMode: "without-photo",
    canvaUrl: buildCanvaUrl("Colorful Gradient Graphic Designer"),
    promptHint:
      "Prioritize portfolio outcomes, design process, and cross-functional impact."
  },
  {
    id: "canva-white-minimalist-clean",
    name: "White Minimalist Clean",
    description: "Canva no-photo universal template for broad ATS compatibility and recruiter scan.",
    accent: "#155e75",
    layout: "minimal",
    photoMode: "without-photo",
    canvaUrl: buildCanvaUrl("White Minimalist"),
    promptHint:
      "Use ATS-safe headings, concise bullets, and neutral professional language."
  }
];

export function getTemplateById(templateId: string) {
  return RESUME_TEMPLATES.find((template) => template.id === templateId) || null;
}
