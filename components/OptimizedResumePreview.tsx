"use client";

import NextImage from "next/image";
import { UserRound } from "lucide-react";

import { compactOptimizedResumeContent } from "@/lib/optimized-resume-render";
import { RESUME_LAYOUT } from "@/lib/resume-layout";
import { OptimizedResumeContent, ResumeTemplate } from "@/types";

type OptimizedResumePreviewProps = {
  content: OptimizedResumeContent;
  template: ResumeTemplate;
};

export default function OptimizedResumePreview({ content, template }: OptimizedResumePreviewProps) {
  const compact = compactOptimizedResumeContent(content);
  const showPhotoSlot = template.photoMode === "with-photo" || Boolean(compact.header.photoUrl);
  const sectionTitleColor = template.accent;
  const subtitle = [compact.header.email, compact.header.phone, compact.header.location].filter(Boolean).join(" | ");
  const links = compact.header.links.join(" | ");
  const pageStyle = {
    maxWidth: `${RESUME_LAYOUT.pageWidth}px`,
    padding: `${RESUME_LAYOUT.margin}px`,
    fontFamily: "Helvetica, Arial, sans-serif"
  } as const;

  return (
    <div className="mx-auto w-full rounded-xl border border-slate-300 bg-white shadow-sm" style={pageStyle}>
      <header className="border-b border-slate-300 pb-3">
        <div className={showPhotoSlot ? "flex items-start justify-between" : ""} style={{ gap: `${RESUME_LAYOUT.headerGap}px` }}>
          <div className="min-w-0 flex-1">
            <h3
              className="font-display font-bold leading-tight"
              style={{ color: sectionTitleColor, fontSize: `${RESUME_LAYOUT.font.name}px` }}
            >
              {compact.header.name || "Candidate Name"}
            </h3>
            <p className="mt-1 font-medium text-slate-800" style={{ fontSize: `${RESUME_LAYOUT.font.role}px` }}>
              {compact.header.role || "Professional"}
            </p>
            {subtitle ? (
              <p className="mt-2 text-slate-600" style={{ fontSize: `${RESUME_LAYOUT.font.contact}px` }}>
                {subtitle}
              </p>
            ) : null}
            {links ? (
              <p className="mt-1 break-all text-slate-600" style={{ fontSize: `${RESUME_LAYOUT.font.link}px` }}>
                {links}
              </p>
            ) : null}
          </div>
          {showPhotoSlot ? (
            compact.header.photoUrl ? (
              <NextImage
                src={compact.header.photoUrl}
                alt="Profile"
                width={RESUME_LAYOUT.photoSize}
                height={RESUME_LAYOUT.photoSize}
                unoptimized
                className="flex-shrink-0 border border-slate-300 object-cover"
                style={{ width: `${RESUME_LAYOUT.photoSize}px`, height: `${RESUME_LAYOUT.photoSize}px` }}
              />
            ) : (
              <div
                className="flex flex-shrink-0 items-center justify-center border border-slate-300 bg-slate-100"
                style={{ width: `${RESUME_LAYOUT.photoSize}px`, height: `${RESUME_LAYOUT.photoSize}px` }}
              >
                <UserRound className="h-8 w-8 text-slate-500" />
              </div>
            )
          ) : null}
        </div>
      </header>

      {compact.summary ? (
        <section className="mt-3.5">
          <SectionTitle title="PROFESSIONAL SUMMARY" color={sectionTitleColor} />
          <p className="text-slate-800" style={{ fontSize: `${RESUME_LAYOUT.font.body}px`, lineHeight: 1.42 }}>
            {compact.summary}
          </p>
        </section>
      ) : null}

      {compact.skills.core.length || compact.skills.tools.length || compact.skills.soft.length ? (
        <section className="mt-3">
          <SectionTitle title="SKILLS" color={sectionTitleColor} />
          <div className="space-y-1 text-slate-800" style={{ fontSize: `${RESUME_LAYOUT.font.bodyTight}px`, lineHeight: 1.35 }}>
            {compact.skills.core.length ? (
              <p>
                <span className="font-semibold">Core:</span> {compact.skills.core.join(", ")}
              </p>
            ) : null}
            {compact.skills.tools.length ? (
              <p>
                <span className="font-semibold">Tools:</span> {compact.skills.tools.join(", ")}
              </p>
            ) : null}
            {compact.skills.soft.length ? (
              <p>
                <span className="font-semibold">Soft:</span> {compact.skills.soft.join(", ")}
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {compact.experience.length ? (
        <section className="mt-3">
          <SectionTitle title="EXPERIENCE" color={sectionTitleColor} />
          <div className="space-y-2.5">
            {compact.experience.map((item, index) => (
              <article
                key={`${item.company}-${index}`}
                className="text-slate-800"
                style={{ fontSize: `${RESUME_LAYOUT.font.bodyTight}px`, lineHeight: 1.34 }}
              >
                <div className="flex items-start justify-between gap-4">
                  <p className="font-semibold text-slate-900">
                    {[item.role, item.company].filter(Boolean).join(" | ") || "Role | Company"}
                  </p>
                  <p className="whitespace-nowrap text-slate-600" style={{ fontSize: `${RESUME_LAYOUT.font.meta}px` }}>
                    {[item.startDate, item.endDate].filter(Boolean).join(" - ")}
                  </p>
                </div>
                {item.location ? (
                  <p className="text-slate-600" style={{ fontSize: `${RESUME_LAYOUT.font.meta}px` }}>
                    {item.location}
                  </p>
                ) : null}
                {item.bullets.length ? (
                  <ul className="mt-1 list-disc pl-5">
                    {item.bullets.map((bullet, bulletIndex) => (
                      <li key={`${index}-${bulletIndex}`} className="mt-0.5">
                        {bullet}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {compact.projects.length ? (
        <section className="mt-3">
          <SectionTitle title="PROJECTS" color={sectionTitleColor} />
          <div className="space-y-2.5">
            {compact.projects.map((project, index) => (
              <article
                key={`${project.name}-${index}`}
                className="text-slate-800"
                style={{ fontSize: `${RESUME_LAYOUT.font.bodyTight}px`, lineHeight: 1.34 }}
              >
                <p className="font-semibold text-slate-900">{[project.name, project.role].filter(Boolean).join(" - ") || "Project"}</p>
                {project.tech.length ? (
                  <p className="text-slate-600" style={{ fontSize: `${RESUME_LAYOUT.font.meta}px` }}>
                    Tech Stack: {project.tech.join(", ")}
                  </p>
                ) : null}
                {project.bullets.length ? (
                  <div className="mt-1">
                    <p className="font-semibold text-slate-700" style={{ fontSize: `${RESUME_LAYOUT.font.meta}px` }}>
                      Project Description:
                    </p>
                    <ul className="mt-0.5 list-disc pl-5">
                      {project.bullets.map((bullet, bulletIndex) => (
                        <li key={`${index}-${bulletIndex}`} className="mt-0.5">
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {project.link ? (
                  <p className="mt-1 break-all text-slate-600" style={{ fontSize: `${RESUME_LAYOUT.font.meta}px` }}>
                    GitHub Repo: {project.link}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {compact.education.length ? (
        <section className="mt-3">
          <SectionTitle title="EDUCATION" color={sectionTitleColor} />
          <div className="space-y-2.5">
            {compact.education.map((item, index) => (
              <article
                key={`${item.institution}-${index}`}
                className="text-slate-800"
                style={{ fontSize: `${RESUME_LAYOUT.font.bodyTight}px`, lineHeight: 1.34 }}
              >
                <div className="flex items-start justify-between gap-4">
                  <p className="font-semibold text-slate-900">
                    {[item.degree, item.institution].filter(Boolean).join(" | ") || "Degree | Institution"}
                  </p>
                  <p className="whitespace-nowrap text-slate-600" style={{ fontSize: `${RESUME_LAYOUT.font.meta}px` }}>
                    {[item.startDate, item.endDate].filter(Boolean).join(" - ")}
                  </p>
                </div>
                {item.details.map((detail, detailIndex) => (
                  <p key={`${index}-${detailIndex}`} className="ml-2 mt-0.5">
                    - {detail}
                  </p>
                ))}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {compact.certifications.length ? (
        <section className="mt-3">
          <SectionTitle title="CERTIFICATIONS" color={sectionTitleColor} />
          <ul className="list-disc pl-5 text-slate-800" style={{ fontSize: `${RESUME_LAYOUT.font.bodyTight}px` }}>
            {compact.certifications.map((certification, certificationIndex) => (
              <li key={`${certification}-${certificationIndex}`} className="mt-0.5">
                {certification}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function SectionTitle({ title, color }: { title: string; color: string }) {
  return (
    <div className="mb-1.5">
      <p
        className="font-bold tracking-[0.11em]"
        style={{ color, fontSize: `${RESUME_LAYOUT.font.sectionTitle}px` }}
      >
        {title}
      </p>
      <div className="mt-1 h-px bg-slate-300" />
    </div>
  );
}
