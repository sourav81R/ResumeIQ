import Link from "next/link";
import { redirect } from "next/navigation";

import ManualResumeBuilder from "@/components/ManualResumeBuilder";
import { Button } from "@/components/ui/button";
import { getServerSessionUser } from "@/lib/auth-server";
import { getTemplateById } from "@/lib/resume-templates";

type PageProps = {
  searchParams?: {
    templateId?: string | string[];
  };
};

export default async function ResumeBuilderPage({ searchParams }: PageProps) {
  const user = await getServerSessionUser();

  if (!user) {
    redirect("/login?redirect=/templates");
  }

  const templateValue = searchParams?.templateId;
  const templateId = Array.isArray(templateValue) ? templateValue[0] : templateValue;

  if (!templateId) {
    redirect("/templates");
  }

  const template = getTemplateById(templateId);
  if (!template) {
    redirect("/templates");
  }

  return (
    <div className="container py-6 sm:py-8 md:py-10">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">Resume Composer</p>
          <h1 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">Build Your Resume</h1>
          <p className="mt-1 text-sm text-slate-600 sm:text-base">
            Fill in your details, preview live, and download a polished one-page PDF.
          </p>
        </div>
        <Button asChild variant="outline" className="bg-white">
          <Link href="/templates">Change Template</Link>
        </Button>
      </div>

      <ManualResumeBuilder template={template} />
    </div>
  );
}
