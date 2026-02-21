import Link from "next/link";
import { redirect } from "next/navigation";

import TemplateSelectionClient from "@/components/TemplateSelectionClient";
import { Button } from "@/components/ui/button";
import { getServerSessionUser } from "@/lib/auth-server";
import { RESUME_TEMPLATES } from "@/lib/resume-templates";

export default async function TemplatesPage() {
  const user = await getServerSessionUser();

  if (!user) {
    redirect("/login?redirect=/templates");
  }

  return (
    <div className="container overflow-x-clip py-6 sm:py-8 md:py-10">
      <div className="mb-5 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">Template Gallery</p>
          <h1 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">Template Selection</h1>
          <p className="mt-1 text-sm text-slate-600 sm:text-base">
            Pick a professional template and start building your first resume.
          </p>
        </div>
        <Button asChild variant="outline" className="w-full bg-white sm:w-auto">
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>

      <TemplateSelectionClient templates={RESUME_TEMPLATES} />
    </div>
  );
}
