"use client";

import NextImage from "next/image";
import { UserRound } from "lucide-react";

import { compactOptimizedResumeContent } from "@/lib/optimized-resume-render";
import { OptimizedResumeContent, ResumeTemplate } from "@/types";

type OptimizedResumePreviewProps = {
  content: OptimizedResumeContent;
  template: ResumeTemplate;
};

const templateClasses: Record<ResumeTemplate["layout"], string> = {
  classic: "border-slate-300 bg-white",
  modern: "border-cyan-200 bg-gradient-to-br from-white to-cyan-50/40",
  minimal: "border-slate-200 bg-slate-50/50"
};

export default function OptimizedResumePreview({ content, template }: OptimizedResumePreviewProps) {
  const compact = compactOptimizedResumeContent(content);
  const showPhotoSlot = template.photoMode === "with-photo" || Boolean(compact.header.photoUrl);
  const sectionTitleColor = template.accent;
  const subtitle = [compact.header.email, compact.header.phone, compact.header.location].filter(Boolean).join(" | ");
  const links = compact.header.links.join(" | ");

  return (
    <div className={`rounded-2xl border p-5 shadow-sm sm:p-6 ${templateClasses[template.layout]} mx-auto max-w-[800px]`}>
      <header className="border-b border-slate-200 pb-3">
        <div className={showPhotoSlot ? "flex items-start justify-between gap-4" : ""}>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-[2rem] font-bold leading-tight" style={{ color: sectionTitleColor }}>
              {compact.header.name || "Candidate Name"}
            </h3>
            <p className="mt-1 text-sm font-medium text-slate-800">{compact.header.role || "Professional"}</p>
            {subtitle ? <p className="mt-2 text-xs text-slate-600">{subtitle}</p> : null}
            {links ? <p className="mt-1 text-xs text-slate-600 break-all">{links}</p> : null}
          </div>
          {showPhotoSlot ? (
            compact.header.photoUrl ? (
              <NextImage
                src={compact.header.photoUrl}
                alt="Profile"
                width={80}
                height={80}
                unoptimized
                className="h-[78px] w-[78px] flex-shrink-0 rounded-none border border-slate-300 object-cover"
              />
            ) : (
              <div className="flex h-[78px] w-[78px] flex-shrink-0 items-center justify-center rounded-none border border-slate-300 bg-slate-100">
                <UserRound className="h-8 w-8 text-slate-500" />
              </div>
            )
          ) : null}
        </div>
      </header>

      {compact.summary ? (
        <section className="mt-3">
          <SectionTitle title="PROFESSIONAL SUMMARY" color={sectionTitleColor} />
          <p className="text-[13px] leading-[1.45] text-slate-800">{compact.summary}</p>
        </section>
      ) : null}

      {compact.skills.core.length || compact.skills.tools.length || compact.skills.soft.length ? (
        <section className="mt-2.5">
          <SectionTitle title="SKILLS" color={sectionTitleColor} />
          <div className="space-y-1 text-[12.6px] leading-[1.35] text-slate-800">
            {compact.skills.core.length ? <p><span className="font-semibold">Core:</span> {compact.skills.core.join(", ")}</p> : null}
            {compact.skills.tools.length ? <p><span className="font-semibold">Tools:</span> {compact.skills.tools.join(", ")}</p> : null}
            {compact.skills.soft.length ? <p><span className="font-semibold">Soft:</span> {compact.skills.soft.join(", ")}</p> : null}
          </div>
        </section>
      ) : null}

      {compact.experience.length ? (
        <section className="mt-2.5">
          <SectionTitle title="EXPERIENCE" color={sectionTitleColor} />
          <div className="space-y-2">
            {compact.experience.map((item, index) => (
              <article key={`${item.company}-${index}`} className="text-[12.8px] leading-[1.35] text-slate-800">
                <div className="flex items-start justify-between gap-4">
                  <p className="font-semibold text-slate-900">{[item.role, item.company].filter(Boolean).join(" | ") || "Role | Company"}</p>
                  <p className="whitespace-nowrap text-[11px] text-slate-600">{[item.startDate, item.endDate].filter(Boolean).join(" - ")}</p>
                </div>
                {item.location ? <p className="text-[11px] text-slate-600">{item.location}</p> : null}
                {item.bullets.map((bullet, bulletIndex) => (
                  <p key={`${index}-${bulletIndex}`} className="ml-2 mt-0.5 text-[12.6px]">- {bullet}</p>
                ))}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {compact.projects.length ? (
        <section className="mt-2.5">
          <SectionTitle title="PROJECTS" color={sectionTitleColor} />
          <div className="space-y-2">
            {compact.projects.map((project, index) => (
              <article key={`${project.name}-${index}`} className="text-[12.6px] leading-[1.35] text-slate-800">
                <p className="font-semibold text-slate-900">{[project.name, project.role].filter(Boolean).join(" - ") || "Project"}</p>
                {project.tech.length ? <p className="text-[11px] text-slate-600">Tech: {project.tech.join(", ")}</p> : null}
                {project.link ? <p className="text-[11px] text-slate-600 break-all">Link: {project.link}</p> : null}
                {project.bullets.map((bullet, bulletIndex) => (
                  <p key={`${index}-${bulletIndex}`} className="ml-2 mt-0.5">- {bullet}</p>
                ))}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {compact.education.length ? (
        <section className="mt-2.5">
          <SectionTitle title="EDUCATION" color={sectionTitleColor} />
          <div className="space-y-2">
            {compact.education.map((item, index) => (
              <article key={`${item.institution}-${index}`} className="text-[12.6px] leading-[1.35] text-slate-800">
                <div className="flex items-start justify-between gap-4">
                  <p className="font-semibold text-slate-900">
                    {[item.degree, item.institution].filter(Boolean).join(" | ") || "Degree | Institution"}
                  </p>
                  <p className="whitespace-nowrap text-[11px] text-slate-600">{[item.startDate, item.endDate].filter(Boolean).join(" - ")}</p>
                </div>
                {item.details.map((detail, detailIndex) => (
                  <p key={`${index}-${detailIndex}`} className="ml-2 mt-0.5">- {detail}</p>
                ))}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {compact.certifications.length ? (
        <section className="mt-2.5">
          <SectionTitle title="CERTIFICATIONS" color={sectionTitleColor} />
          <p className="text-[12.6px] text-slate-800">{compact.certifications.join(", ")}</p>
        </section>
      ) : null}
    </div>
  );
}

function SectionTitle({ title, color }: { title: string; color: string }) {
  return (
    <div className="mb-1.5">
      <p className="text-[12px] font-bold tracking-[0.18em]" style={{ color }}>
        {title}
      </p>
      <div className="mt-1 h-px bg-slate-300" />
    </div>
  );
}
