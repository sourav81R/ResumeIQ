import Link from "next/link";
import { ArrowRight, CheckCircle2, FileSearch, FileStack, Sparkles, Target } from "lucide-react";

import { Button } from "@/components/ui/button";

const features = [
  {
    icon: FileStack,
    title: "Smart Resume Parsing",
    description: "Upload PDF or DOCX files and extract resume content instantly."
  },
  {
    icon: Target,
    title: "Role-Based ATS Scoring",
    description: "Get weighted scoring for keywords, skills, formatting, education and experience."
  },
  {
    icon: Sparkles,
    title: "AI Optimization Suggestions",
    description: "Receive section-level feedback and improvements tailored for your target role."
  }
];

export default function HomePage() {
  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute -left-24 top-6 h-72 w-72 rounded-full bg-cyan-300/35 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-14 h-72 w-72 rounded-full bg-amber-200/35 blur-3xl" />

      <section className="container py-8 sm:py-10 lg:py-14">
        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="surface-panel fade-up p-6 sm:p-8 lg:p-10">
            <p className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-700 sm:text-xs">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Resume Optimization Platform
            </p>

            <h1 className="mt-5 text-balance font-display text-4xl font-bold leading-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Turn resume drafts into <span className="text-gradient">shortlist-ready profiles</span>.
            </h1>

            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base lg:text-lg">
              ResumeIQ combines ATS scoring, role-fit diagnostics, and AI rewrite guidance so each resume version is
              precise, targeted, and recruiter-friendly.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 w-full sm:w-auto">
                <Link href="/upload">
                  Start New Analysis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 w-full sm:w-auto">
                <Link href="/dashboard">Open Dashboard</Link>
              </Button>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="surface-muted p-3">
                <p className="text-xl font-bold text-cyan-800 sm:text-2xl">100</p>
                <p className="text-xs font-medium text-cyan-900/80 sm:text-sm">Point ATS Index</p>
              </div>
              <div className="surface-muted p-3">
                <p className="text-xl font-bold text-teal-800 sm:text-2xl">Role Fit</p>
                <p className="text-xs font-medium text-teal-900/80 sm:text-sm">Weighted Breakdown</p>
              </div>
              <div className="surface-muted col-span-2 p-3 sm:col-span-1">
                <p className="text-xl font-bold text-slate-800 sm:text-2xl">Actionable</p>
                <p className="text-xs font-medium text-slate-900/80 sm:text-sm">Section Feedback</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="surface-panel fade-up p-5 sm:p-6"
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div className="inline-flex rounded-2xl bg-[linear-gradient(135deg,#0891b2_0%,#0f766e_100%)] p-2.5 text-white shadow-lg">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="font-display text-lg font-semibold text-slate-900">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="container pb-8 sm:pb-10 lg:pb-14">
        <div className="surface-panel grid gap-4 p-5 sm:grid-cols-3 sm:p-6">
          <div className="surface-muted p-4">
            <FileSearch className="mb-2 h-5 w-5 text-cyan-700" />
            <p className="text-sm font-semibold text-slate-900">1. Parse + Score</p>
            <p className="mt-1 text-sm text-slate-600">Upload your resume and get ATS scoring aligned to the selected role.</p>
          </div>
          <div className="surface-muted p-4">
            <Target className="mb-2 h-5 w-5 text-cyan-700" />
            <p className="text-sm font-semibold text-slate-900">2. Diagnose Gaps</p>
            <p className="mt-1 text-sm text-slate-600">Identify missing skills, weak sections, and keyword opportunities.</p>
          </div>
          <div className="surface-muted p-4">
            <Sparkles className="mb-2 h-5 w-5 text-cyan-700" />
            <p className="text-sm font-semibold text-slate-900">3. Optimize + Export</p>
            <p className="mt-1 text-sm text-slate-600">Apply AI-guided edits, preview polished layouts, and export instantly.</p>
          </div>
        </div>
      </section>
    </div>
  );
}


