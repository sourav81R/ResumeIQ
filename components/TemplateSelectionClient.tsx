"use client";

import Link from "next/link";
import NextImage from "next/image";
import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Sparkles, UserRound } from "lucide-react";

import OptimizedResumePreview from "@/components/OptimizedResumePreview";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildTemplatePreviewContent } from "@/lib/template-preview-data";
import { cn } from "@/lib/utils";
import { OptimizedResumeContent, ResumeTemplate } from "@/types";

function TemplateThumbnail({
  template,
  previewContent
}: {
  template: ResumeTemplate;
  previewContent: OptimizedResumeContent;
}) {
  const subtitle = [previewContent.header.role, previewContent.header.location].filter(Boolean).join(" | ");
  const highlight =
    previewContent.experience[0]?.bullets[0] || previewContent.projects[0]?.bullets[0] || previewContent.summary;

  return (
    <div className="mb-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="h-2.5" style={{ backgroundColor: template.accent }} />
      <div className="space-y-2 p-2.5">
        <div className="flex items-start gap-2.5">
          {template.photoMode === "with-photo" ? (
            previewContent.header.photoUrl ? (
              <NextImage
                src={previewContent.header.photoUrl}
                alt="Template sample profile"
                width={34}
                height={34}
                unoptimized
                className="h-9 w-9 flex-shrink-0 rounded-full border border-slate-300 object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100">
                <UserRound className="h-4 w-4 text-slate-500" />
              </div>
            )
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-slate-900">{previewContent.header.name}</p>
            <p className="line-clamp-2 text-[11px] leading-4 text-slate-600">{subtitle || "Professional resume layout"}</p>
          </div>
        </div>
        <p className="line-clamp-2 break-words text-[11px] leading-4 text-slate-600">{highlight.slice(0, 130)}</p>
      </div>
    </div>
  );
}

type TemplateSelectionClientProps = {
  templates: ResumeTemplate[];
};

export default function TemplateSelectionClient({ templates }: TemplateSelectionClientProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0]?.id || "");

  const previewMap = useMemo(
    () =>
      Object.fromEntries(
        templates.map((template) => [template.id, buildTemplatePreviewContent(template)])
      ) as Record<string, OptimizedResumeContent>,
    [templates]
  );

  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) || templates[0] || null;
  const selectedPreview = selectedTemplate ? previewMap[selectedTemplate.id] : null;

  if (!templates.length) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center text-slate-600">No resume templates available right now.</CardContent>
      </Card>
    );
  }

  return (
    <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,460px)]">
      <Card className="min-w-0 bg-white/92">
        <CardHeader className="p-4 pb-3 sm:p-6 sm:pb-3">
          <CardTitle className="font-display text-xl text-slate-900">Choose a Template</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 p-4 pt-0 sm:grid-cols-2 sm:p-6 sm:pt-0">
          {templates.map((template) => {
            const previewContent = previewMap[template.id];
            const isSelected = template.id === selectedTemplateId;

            return (
              <article
                key={template.id}
                className={cn(
                  "min-w-0 overflow-hidden rounded-xl border p-3 transition",
                  isSelected
                    ? "border-cyan-300 bg-cyan-50/55 shadow-[0_10px_24px_rgba(8,145,178,0.12)]"
                    : "border-slate-200 bg-white"
                )}
              >
                <TemplateThumbnail template={template} previewContent={previewContent} />
                <h3 className="font-semibold text-slate-900">{template.name}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">{template.description}</p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Button
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    className="h-9 w-full px-3 text-xs sm:w-auto"
                    onClick={() => setSelectedTemplateId(template.id)}
                  >
                    {isSelected ? (
                      <>
                        <CheckCircle2 className="mr-1.5 h-4 w-4" />
                        Previewing
                      </>
                    ) : (
                      "Preview"
                    )}
                  </Button>
                  <Button asChild className="h-9 w-full px-3 text-xs sm:w-auto">
                    <Link href={`/resume-builder?templateId=${encodeURIComponent(template.id)}`}>
                      Use Template
                      <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </article>
            );
          })}
        </CardContent>
      </Card>

      <Card className="min-w-0 bg-[linear-gradient(180deg,rgba(236,254,255,0.95)_0%,rgba(255,255,255,0.92)_100%)]">
        <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-2">
          <CardTitle className="font-display text-lg text-slate-900">
            Live Template Preview
            {selectedTemplate ? (
              <span className="mt-1 block text-sm text-cyan-700 sm:ml-2 sm:inline sm:text-base">
                ({selectedTemplate.name})
              </span>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-4 pb-4 pt-0 sm:px-6 sm:pb-6">
          {selectedTemplate && selectedPreview ? (
            <>
              <div className="min-w-0">
                <div className="min-w-0">
                  <OptimizedResumePreview content={selectedPreview} template={selectedTemplate} />
                </div>
              </div>
              <div className="rounded-lg border border-cyan-200 bg-white/80 p-3 text-sm text-slate-700">
                <p className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-cyan-700" />
                  {selectedTemplate.promptHint}
                </p>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-600">Select a template to preview.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
