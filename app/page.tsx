"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, FileStack, Sparkles, Target } from "lucide-react";

import { useAuth } from "@/components/AuthProvider";
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
  const { user, loading } = useAuth();
  const analyzeHref = !loading && user ? "/upload" : "/login?redirect=/upload";
  const dashboardHref = !loading && user ? "/dashboard" : "/login?redirect=/dashboard";

  return (
    <div className="overflow-hidden">
      <section className="container grid min-h-[calc(100vh-4rem)] items-center gap-10 py-12 md:grid-cols-2 md:py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          <p className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            AI Powered ATS Optimizer
          </p>

          <h1 className="text-balance text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Build ATS-ready resumes with measurable precision.
          </h1>

          <p className="max-w-xl text-base text-slate-600 sm:text-lg">
            ResumeIQ analyzes your resume against job roles, calculates ATS score breakdowns, and gives
            practical suggestions to improve interview readiness.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href={analyzeHref}>
                Analyze Resume
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
              <Link href={dashboardHref}>View Dashboard</Link>
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="grid gap-4"
        >
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="mb-3 inline-flex rounded-lg bg-cyan-100 p-2 text-cyan-700">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">{feature.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{feature.description}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </section>
    </div>
  );
}


