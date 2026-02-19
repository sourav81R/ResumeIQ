import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ProductSlug = "ats-analyzer" | "recent-reports" | "resume-studio" | "support";

const productContent: Record<
  ProductSlug,
  {
    title: string;
    intro: string;
    points: string[];
    ctaLabel: string;
    ctaHref: string;
  }
> = {
  "ats-analyzer": {
    title: "ATS Analyzer",
    intro:
      "ResumeIQ ATS Analyzer scores your resume for a target role and explains where your profile is strong or weak.",
    points: [
      "Checks keyword match, skill match, formatting, experience, and education signals.",
      "Highlights missing skills and role-relevant improvements.",
      "Gives focused suggestions so you can improve interview-readiness quickly."
    ],
    ctaLabel: "Analyze Resume",
    ctaHref: "/upload"
  },
  "recent-reports": {
    title: "Recent Reports",
    intro:
      "Recent Reports stores your latest analyses so you can revisit ATS scores and compare progress over time.",
    points: [
      "Review ATS score trends for each uploaded resume.",
      "Open full report details with keyword and skill breakdown.",
      "Manage cards by removing reports you no longer need."
    ],
    ctaLabel: "Open Dashboard",
    ctaHref: "/dashboard"
  },
  "resume-studio": {
    title: "Resume Studio",
    intro:
      "Resume Studio helps you generate and edit an optimized resume version, then export a polished one-page PDF.",
    points: [
      "Uses AI-driven improvements aligned to your selected role.",
      "Lets you edit sections like summary, skills, projects, and certifications.",
      "Provides live preview with template controls and PDF download."
    ],
    ctaLabel: "Go To Studio",
    ctaHref: "/upload"
  },
  support: {
    title: "Support",
    intro:
      "Need help with uploads, ATS scoring, or PDF export? ResumeIQ support resources are here to guide you.",
    points: [
      "Use clear PDF/DOCX files for best parsing quality.",
      "If generation fails, retry with a cleaner role description.",
      "For assistance, contact: support@resumeiq.ai."
    ],
    ctaLabel: "Back To Dashboard",
    ctaHref: "/dashboard"
  }
};

type PageProps = {
  params: {
    slug: string;
  };
};

export default function ProductInfoPage({ params }: PageProps) {
  const slug = params.slug as ProductSlug;
  const content = productContent[slug];

  if (!content) {
    notFound();
  }

  return (
    <div className="container py-8 sm:py-10">
      <Card className="mx-auto max-w-4xl border-cyan-200/80 bg-white/95 shadow-[0_16px_32px_rgba(2,35,71,0.1)]">
        <CardHeader>
          <CardTitle className="font-display text-2xl text-slate-900 sm:text-3xl">{content.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-base leading-7 text-slate-700 sm:text-lg">{content.intro}</p>

          <ul className="space-y-2.5 text-slate-700">
            {content.points.map((point) => (
              <li key={point} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                {point}
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-3 pt-1">
            <Button asChild className="rounded-xl">
              <Link href={content.ctaHref}>
                {content.ctaLabel}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl bg-white">
              <Link href="/">Back Home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
