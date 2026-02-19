import Link from "next/link";
import { ArrowRight, CheckCircle2, FileStack, Sparkles, Target } from "lucide-react";

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
      <div className="pointer-events-none absolute -left-20 top-12 h-72 w-72 rounded-full bg-cyan-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-28 h-72 w-72 rounded-full bg-teal-200/35 blur-3xl" />

      <section className="container py-8 sm:py-10 lg:py-14">
        <div className="grid items-stretch gap-6 lg:grid-cols-[1.1fr_0.9fr] xl:gap-8">
          <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-[0_18px_40px_rgba(3,35,72,0.12)] backdrop-blur-sm sm:p-8 lg:p-10">
            <p className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-700 sm:text-xs">
              <CheckCircle2 className="h-3.5 w-3.5" />
              AI Powered ATS Optimizer
            </p>

            <h1 className="mt-5 text-balance font-display text-4xl font-bold leading-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Build ATS-ready resumes recruiters notice in seconds.
            </h1>

            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base lg:text-lg">
              ResumeIQ scores your resume by role-fit, highlights missing signals, and gives focused edits so
              your profile gets shortlisted faster.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 w-full rounded-xl sm:w-auto">
                <Link href="/upload">
                  Analyze Resume
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 w-full rounded-xl bg-white sm:w-auto">
                <Link href="/dashboard">View Dashboard</Link>
              </Button>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-cyan-100 bg-cyan-50/70 p-3">
                <p className="text-xl font-bold text-cyan-800 sm:text-2xl">5x</p>
                <p className="text-xs font-medium text-cyan-900/80 sm:text-sm">Faster Review</p>
              </div>
              <div className="rounded-2xl border border-teal-100 bg-teal-50/70 p-3">
                <p className="text-xl font-bold text-teal-800 sm:text-2xl">100</p>
                <p className="text-xs font-medium text-teal-900/80 sm:text-sm">Point ATS Scale</p>
              </div>
              <div className="col-span-2 rounded-2xl border border-sky-100 bg-sky-50/70 p-3 sm:col-span-1">
                <p className="text-xl font-bold text-sky-800 sm:text-2xl">Role Based</p>
                <p className="text-xs font-medium text-sky-900/80 sm:text-sm">Actionable Suggestions</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_14px_32px_rgba(3,35,72,0.1)] backdrop-blur-sm sm:p-6"
                >
                  <div className="mb-4 inline-flex rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-500 p-2.5 text-white shadow-lg">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="mb-2 inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Feature 0{index + 1}
                  </div>
                  <h3 className="font-display text-lg font-semibold text-slate-900">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}


