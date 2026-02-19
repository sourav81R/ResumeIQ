"use client";

import NextImage from "next/image";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Download,
  ExternalLink,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  UserRound
} from "lucide-react";

import OptimizedResumePreview from "@/components/OptimizedResumePreview";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { buildTemplatePreviewContent } from "@/lib/template-preview-data";
import { OptimizedResumeContent, OptimizedResumeVersion, ResumeTemplate } from "@/types";

type ResumeOptimizationStudioProps = {
  resumeId: string;
  originalAtsScore: number;
  originalResumeText?: string;
};

type TemplateMode = ResumeTemplate["photoMode"];
const MAX_PHOTO_FILE_BYTES = 4 * 1024 * 1024;
const PHOTO_DIMENSION = 256;
const MAX_EXPERIENCE_ITEMS = 12;
const MAX_PROJECT_ITEMS = 12;
const MAX_EDUCATION_ITEMS = 8;
const MAX_CERTIFICATION_ITEMS = 15;

function createEmptyExperience(): OptimizedResumeContent["experience"][number] {
  return {
    company: "",
    role: "",
    location: "",
    startDate: "",
    endDate: "",
    bullets: []
  };
}

function createEmptyProject(): OptimizedResumeContent["projects"][number] {
  return {
    name: "",
    role: "",
    tech: [],
    link: "",
    bullets: []
  };
}

function createEmptyEducation(): OptimizedResumeContent["education"][number] {
  return {
    institution: "",
    degree: "",
    startDate: "",
    endDate: "",
    details: []
  };
}

function moveItem<T>(items: T[], fromIndex: number, toIndex: number) {
  if (toIndex < 0 || toIndex >= items.length || fromIndex === toIndex) {
    return items;
  }

  const next = [...items];
  const [entry] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, entry);
  return next;
}

function toTextAreaValue(values: string[]) {
  return values.join("\n");
}

function fromTextAreaValue(value: string) {
  return value
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function cloneContent(content: OptimizedResumeContent) {
  return JSON.parse(JSON.stringify(content)) as OptimizedResumeContent;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Unable to read image file."));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to process image."));
    image.src = dataUrl;
  });
}

async function optimizePhotoDataUrl(file: File) {
  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = PHOTO_DIMENSION;
  canvas.height = PHOTO_DIMENSION;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Unable to prepare image.");
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, PHOTO_DIMENSION, PHOTO_DIMENSION);

  const scale = Math.max(PHOTO_DIMENSION / image.width, PHOTO_DIMENSION / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  const x = (PHOTO_DIMENSION - width) / 2;
  const y = (PHOTO_DIMENSION - height) / 2;
  ctx.drawImage(image, x, y, width, height);

  let compressed = canvas.toDataURL("image/jpeg", 0.84);
  if (compressed.length > 320000) {
    compressed = canvas.toDataURL("image/jpeg", 0.7);
  }
  return compressed;
}

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
            <p className="truncate text-[11px] text-slate-600">{subtitle || "Professional resume layout"}</p>
          </div>
        </div>
        <p className="text-[11px] leading-4 text-slate-600">{highlight.slice(0, 130)}</p>
      </div>
    </div>
  );
}

export default function ResumeOptimizationStudio({
  resumeId,
  originalAtsScore,
  originalResumeText
}: ResumeOptimizationStudioProps) {
  const [templates, setTemplates] = useState<ResumeTemplate[]>([]);
  const [versions, setVersions] = useState<OptimizedResumeVersion[]>([]);
  const [templateMode, setTemplateMode] = useState<TemplateMode>("without-photo");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [previewTemplateId, setPreviewTemplateId] = useState<string>("");
  const [activeVersionId, setActiveVersionId] = useState<string>("");
  const [draftContent, setDraftContent] = useState<OptimizedResumeContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        setError("");

        const [templateResponse, versionsResponse] = await Promise.all([
          fetch("/api/resume-templates"),
          fetch(`/api/report/${resumeId}/optimized`)
        ]);

        const templateData = await templateResponse.json();
        const versionsData = await versionsResponse.json();

        if (!templateResponse.ok) {
          throw new Error(templateData.error || "Unable to load templates.");
        }

        if (!versionsResponse.ok) {
          throw new Error(versionsData.error || "Unable to load optimized resume versions.");
        }

        const fetchedTemplates = (templateData.templates || []) as ResumeTemplate[];
        const fetchedVersions = (versionsData.versions || []) as OptimizedResumeVersion[];
        const defaultTemplate =
          fetchedTemplates.find((template) => template.photoMode === "without-photo") || fetchedTemplates[0];

        setTemplates(fetchedTemplates);
        setVersions(fetchedVersions);
        setSelectedTemplateId(defaultTemplate?.id || "");
        setPreviewTemplateId(defaultTemplate?.id || "");
        setTemplateMode(defaultTemplate?.photoMode || "without-photo");

        if (fetchedVersions[0]) {
          setActiveVersionId(fetchedVersions[0].id);
          setDraftContent(cloneContent(fetchedVersions[0].content));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to initialize resume studio.");
      } finally {
        setLoading(false);
      }
    };

    void init();
  }, [resumeId]);

  const activeVersion = useMemo(
    () => versions.find((version) => version.id === activeVersionId) || null,
    [activeVersionId, versions]
  );

  const filteredTemplates = useMemo(
    () => templates.filter((template) => template.photoMode === templateMode),
    [templateMode, templates]
  );
  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) || null,
    [selectedTemplateId, templates]
  );
  const templatePreviewMap = useMemo(() => {
    const entries = templates.map((template) => [template.id, buildTemplatePreviewContent(template)] as const);
    return Object.fromEntries(entries) as Record<string, OptimizedResumeContent>;
  }, [templates]);
  const previewTemplate = useMemo(
    () =>
      templates.find((template) => template.id === previewTemplateId) ||
      filteredTemplates[0] ||
      selectedTemplate ||
      templates[0] ||
      null,
    [filteredTemplates, previewTemplateId, selectedTemplate, templates]
  );
  const previewTemplateContent = useMemo(
    () =>
      previewTemplate ? templatePreviewMap[previewTemplate.id] || buildTemplatePreviewContent(previewTemplate) : null,
    [previewTemplate, templatePreviewMap]
  );
  const activeTemplate = useMemo(() => {
    if (!activeVersion) return null;
    return templates.find((template) => template.id === activeVersion.templateId) || selectedTemplate || templates[0] || null;
  }, [activeVersion, selectedTemplate, templates]);

  useEffect(() => {
    if (!filteredTemplates.length) return;
    if (!filteredTemplates.some((template) => template.id === selectedTemplateId)) {
      setSelectedTemplateId(filteredTemplates[0].id);
    }
    if (!filteredTemplates.some((template) => template.id === previewTemplateId)) {
      setPreviewTemplateId(filteredTemplates[0].id);
    }
  }, [filteredTemplates, previewTemplateId, selectedTemplateId]);

  const hasUnsavedDraftChanges = useMemo(() => {
    if (!activeVersion || !draftContent) return false;
    return JSON.stringify(activeVersion.content) !== JSON.stringify(draftContent);
  }, [activeVersion, draftContent]);

  const handlePhotoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !draftContent) return;

    if (!file.type.startsWith("image/")) {
      setError("Please upload a valid image file.");
      return;
    }

    if (file.size > MAX_PHOTO_FILE_BYTES) {
      setError("Profile photo must be under 4MB.");
      return;
    }

    try {
      setError("");
      setStatus("Optimizing profile photo...");
      const optimizedPhoto = await optimizePhotoDataUrl(file);
      setDraftContent((current) =>
        current ? { ...current, header: { ...current.header, photoUrl: optimizedPhoto } } : current
      );
      setStatus("Profile photo added. Save edits to keep it.");
    } catch (err) {
      setStatus("");
      setError(err instanceof Error ? err.message : "Unable to add profile photo.");
    }
  };

  const handleAddExperience = () => {
    if (!draftContent) return;
    if (draftContent.experience.length >= MAX_EXPERIENCE_ITEMS) {
      setError(`You can add up to ${MAX_EXPERIENCE_ITEMS} experience entries.`);
      return;
    }

    setError("");
    setDraftContent((current) =>
      current ? { ...current, experience: [...current.experience, createEmptyExperience()] } : current
    );
  };

  const handleRemoveExperience = (index: number) => {
    setDraftContent((current) => {
      if (!current) return current;
      const experience = current.experience.filter((_, entryIndex) => entryIndex !== index);
      return { ...current, experience };
    });
  };

  const handleMoveExperience = (index: number, direction: "up" | "down") => {
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    setDraftContent((current) => {
      if (!current) return current;
      return {
        ...current,
        experience: moveItem(current.experience, index, nextIndex)
      };
    });
  };

  const handleAddProject = () => {
    if (!draftContent) return;
    if (draftContent.projects.length >= MAX_PROJECT_ITEMS) {
      setError(`You can add up to ${MAX_PROJECT_ITEMS} project entries.`);
      return;
    }

    setError("");
    setDraftContent((current) =>
      current ? { ...current, projects: [...current.projects, createEmptyProject()] } : current
    );
  };

  const handleRemoveProject = (index: number) => {
    setDraftContent((current) => {
      if (!current) return current;
      const projects = current.projects.filter((_, entryIndex) => entryIndex !== index);
      return { ...current, projects };
    });
  };

  const handleMoveProject = (index: number, direction: "up" | "down") => {
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    setDraftContent((current) => {
      if (!current) return current;
      return {
        ...current,
        projects: moveItem(current.projects, index, nextIndex)
      };
    });
  };

  const handleAddEducation = () => {
    if (!draftContent) return;
    if (draftContent.education.length >= MAX_EDUCATION_ITEMS) {
      setError(`You can add up to ${MAX_EDUCATION_ITEMS} education entries.`);
      return;
    }

    setError("");
    setDraftContent((current) =>
      current ? { ...current, education: [...current.education, createEmptyEducation()] } : current
    );
  };

  const handleRemoveEducation = (index: number) => {
    setDraftContent((current) => {
      if (!current) return current;
      const education = current.education.filter((_, entryIndex) => entryIndex !== index);
      return { ...current, education };
    });
  };

  const handleMoveEducation = (index: number, direction: "up" | "down") => {
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    setDraftContent((current) => {
      if (!current) return current;
      return {
        ...current,
        education: moveItem(current.education, index, nextIndex)
      };
    });
  };

  const handleAddCertification = () => {
    if (!draftContent) return;
    if (draftContent.certifications.length >= MAX_CERTIFICATION_ITEMS) {
      setError(`You can add up to ${MAX_CERTIFICATION_ITEMS} certifications.`);
      return;
    }

    setError("");
    setDraftContent((current) =>
      current ? { ...current, certifications: [...current.certifications, ""] } : current
    );
  };

  const handleRemoveCertification = (index: number) => {
    setDraftContent((current) => {
      if (!current) return current;
      const certifications = current.certifications.filter((_, entryIndex) => entryIndex !== index);
      return { ...current, certifications };
    });
  };

  const handleMoveCertification = (index: number, direction: "up" | "down") => {
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    setDraftContent((current) => {
      if (!current) return current;
      return {
        ...current,
        certifications: moveItem(current.certifications, index, nextIndex)
      };
    });
  };

  const handleGenerate = async () => {
    if (!selectedTemplateId) {
      setError("Please select a template first.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setStatus("Generating optimized resume with selected template...");

      const response = await fetch(`/api/report/${resumeId}/optimized`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: selectedTemplateId })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to generate optimized resume.");
      }

      const created = data.optimizedResume as OptimizedResumeVersion;
      const nextVersions = [created, ...versions];
      setVersions(nextVersions);
      setActiveVersionId(created.id);
      setDraftContent(cloneContent(created.content));
      setStatus("Optimized resume generated.");
    } catch (err) {
      setStatus("");
      setError(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setLoading(false);
    }
  };

  const persistDraftContent = async () => {
    if (!activeVersion || !draftContent) return;

    try {
      setSaving(true);
      setError("");

      const response = await fetch(`/api/optimized/${activeVersion.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draftContent })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to save edits.");
      }

      const updated = data.optimizedResume as OptimizedResumeVersion;
      setVersions((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)));
      setDraftContent(cloneContent(updated.content));
      setStatus("Edits saved.");
      return updated.id;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdits = async () => {
    await persistDraftContent();
  };

  const handleDownloadPdf = async () => {
    if (!activeVersion) return;

    try {
      setError("");
      let versionId = activeVersion.id;

      if (hasUnsavedDraftChanges) {
        setStatus("Saving latest edits before download...");
        const savedId = await persistDraftContent();
        if (!savedId) return;
        versionId = savedId;
      }

      window.open(`/api/optimized/${versionId}/download`, "_blank", "noopener,noreferrer");
      setStatus("PDF download started.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to download PDF.");
    }
  };

  const originalPreviewText = (originalResumeText || "").slice(0, 1800).trim();

  return (
    <section className="mt-8 grid gap-4">
      <Card className="border-cyan-200/80 bg-gradient-to-br from-cyan-50/90 to-white">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-xl">AI Resume Studio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-700">
            Select a template and generate an ATS-optimized version. You can edit the result, compare with your
            original resume, and export as PDF.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant={templateMode === "without-photo" ? "default" : "outline"}
              className="h-9 rounded-full px-4"
              onClick={() => setTemplateMode("without-photo")}
            >
              Without Photo
            </Button>
            <Button
              type="button"
              variant={templateMode === "with-photo" ? "default" : "outline"}
              className="h-9 rounded-full px-4"
              onClick={() => setTemplateMode("with-photo")}
            >
              With Photo
            </Button>
            <p className="text-xs text-slate-500">{filteredTemplates.length} templates shown</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredTemplates.map((template) => {
              const selected = template.id === selectedTemplateId;
              const previewed = template.id === previewTemplateId;
              const previewContent = templatePreviewMap[template.id] || buildTemplatePreviewContent(template);
              return (
                <div
                  key={template.id}
                  className={`rounded-xl border p-3 text-left transition ${
                    selected
                      ? "border-cyan-500 bg-cyan-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-cyan-300 hover:bg-cyan-50/40"
                  } ${previewed ? "ring-1 ring-cyan-300" : ""}`}
                >
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => {
                      setPreviewTemplateId(template.id);
                      setStatus("Template preview updated.");
                    }}
                  >
                    <TemplateThumbnail template={template} previewContent={previewContent} />
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="font-semibold text-slate-900">{template.name}</p>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                        {template.photoMode === "with-photo" ? "With Photo" : "No Photo"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">{template.description}</p>
                  </button>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant={selected ? "default" : "outline"}
                      className="h-8 rounded-lg px-3 text-xs"
                      onClick={() => {
                        setSelectedTemplateId(template.id);
                        setPreviewTemplateId(template.id);
                        setStatus(`Selected template: ${template.name}.`);
                      }}
                    >
                      {selected ? "Selected" : "Choose Template"}
                    </Button>
                    <a
                      href={template.canvaUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-700 hover:text-cyan-800"
                    >
                      View Canva
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          {previewTemplate && previewTemplateContent ? (
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Advance Preview</p>
                  <p className="text-sm font-semibold text-slate-900">{previewTemplate.name}</p>
                </div>
                <Button
                  type="button"
                  variant={selectedTemplateId === previewTemplate.id ? "default" : "outline"}
                  className="h-9 rounded-lg"
                  onClick={() => {
                    setSelectedTemplateId(previewTemplate.id);
                    setStatus(`Selected template: ${previewTemplate.name}.`);
                  }}
                >
                  {selectedTemplateId === previewTemplate.id ? "Template Selected" : "Choose This Template"}
                </Button>
              </div>
              <div className="max-h-[420px] overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-2">
                <OptimizedResumePreview content={previewTemplateContent} template={previewTemplate} />
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={handleGenerate} disabled={loading || !selectedTemplateId} className="h-11 rounded-xl">
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Optimized Resume
            </Button>
            <p className="flex items-center text-xs text-slate-600">
              Selected template: <span className="ml-1 font-semibold text-slate-800">{selectedTemplate?.name || "None"}</span>
            </p>
          </div>

          {loading ? <LoadingSpinner label={status || "Processing..."} /> : null}
          {status ? <p className="text-sm text-emerald-700">{status}</p> : null}
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        </CardContent>
      </Card>

      {versions.length ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-lg">Version History</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {versions.map((version) => (
              <button
                key={version.id}
                type="button"
                onClick={() => {
                  setActiveVersionId(version.id);
                  setDraftContent(cloneContent(version.content));
                  setStatus("");
                }}
                className={`rounded-xl border p-3 text-left transition ${
                  version.id === activeVersionId
                    ? "border-cyan-500 bg-cyan-50"
                    : "border-slate-200 bg-white hover:border-cyan-300"
                }`}
              >
                <p className="font-semibold text-slate-900">{version.templateName}</p>
                <p className="text-xs text-slate-500">{new Date(version.createdAt).toLocaleString()}</p>
                <p className="mt-1 text-sm font-medium text-slate-700">
                  ATS {version.previousAtsScore} {"->"} {version.scores.atsScore}
                </p>
                <p className="text-xs text-emerald-700">Improvement +{version.improvementScore}</p>
              </button>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {activeVersion && draftContent && activeTemplate ? (
        <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-lg">Original vs Optimized</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Original Resume
                  </p>
                  <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-700">
                    {originalPreviewText || "Original extracted text will appear after analysis."}
                  </p>
                </div>
                <div className="rounded-xl border border-cyan-200 bg-cyan-50/40 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Optimized Summary
                  </p>
                  <p className="text-sm leading-relaxed text-slate-700">{draftContent.summary || "N/A"}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 p-3 text-center">
                  <p className="text-xs uppercase tracking-wider text-slate-500">Old ATS</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{activeVersion.previousAtsScore}</p>
                </div>
                <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-3 text-center">
                  <p className="text-xs uppercase tracking-wider text-cyan-700">New ATS</p>
                  <p className="mt-1 text-2xl font-bold text-cyan-900">{activeVersion.scores.atsScore}</p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center">
                  <p className="text-xs uppercase tracking-wider text-emerald-700">Improvement</p>
                  <p className="mt-1 text-2xl font-bold text-emerald-800">+{activeVersion.improvementScore}</p>
                </div>
              </div>

              {activeVersion.changedLines.length ? (
                <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-teal-700">
                    Highlighted Improvements
                  </p>
                  <ul className="space-y-1 text-sm text-slate-700">
                    {activeVersion.changedLines.slice(0, 10).map((line, index) => (
                      <li key={`${index}-${line}`} className="list-inside list-disc">
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="font-display text-lg">Live Template Preview</CardTitle>
                {activeVersion ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 rounded-lg bg-white"
                    onClick={handleDownloadPdf}
                    disabled={saving || loading}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {hasUnsavedDraftChanges ? "Save + Download PDF" : "Download PDF"}
                  </Button>
                ) : null}
              </div>
            </CardHeader>
            <CardContent>
              <OptimizedResumePreview content={draftContent} template={activeTemplate} />
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeVersion && draftContent ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-lg">Edit Optimized Resume</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <Label>Profile Photo (Optional)</Label>
                  <p className="text-xs text-slate-600">
                    Upload JPG/PNG/WebP to include your photo in preview and downloaded PDF.
                  </p>
                </div>
                {draftContent.header.photoUrl ? (
                  <NextImage
                    src={draftContent.header.photoUrl}
                    alt="Profile preview"
                    width={64}
                    height={64}
                    unoptimized
                    className="h-16 w-16 rounded-lg border border-slate-300 object-cover"
                  />
                ) : null}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Input type="file" accept="image/png,image/jpeg,image/webp" onChange={handlePhotoUpload} />
                {draftContent.header.photoUrl ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 rounded-lg bg-white"
                    onClick={() =>
                      setDraftContent((current) =>
                        current ? { ...current, header: { ...current.header, photoUrl: "" } } : current
                      )
                    }
                  >
                    Remove Photo
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Name</Label>
                <Input
                  value={draftContent.header.name}
                  onChange={(event) =>
                    setDraftContent((current) =>
                      current ? { ...current, header: { ...current.header, name: event.target.value } } : current
                    )
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Role</Label>
                <Input
                  value={draftContent.header.role}
                  onChange={(event) =>
                    setDraftContent((current) =>
                      current ? { ...current, header: { ...current.header, role: event.target.value } } : current
                    )
                  }
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Email</Label>
                <Input
                  value={draftContent.header.email}
                  onChange={(event) =>
                    setDraftContent((current) =>
                      current ? { ...current, header: { ...current.header, email: event.target.value } } : current
                    )
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input
                  value={draftContent.header.phone}
                  onChange={(event) =>
                    setDraftContent((current) =>
                      current ? { ...current, header: { ...current.header, phone: event.target.value } } : current
                    )
                  }
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Summary</Label>
              <Textarea
                rows={4}
                value={draftContent.summary}
                onChange={(event) =>
                  setDraftContent((current) => (current ? { ...current, summary: event.target.value } : current))
                }
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Label className="text-sm font-semibold text-slate-800">Experience</Label>
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 rounded-lg bg-white px-2.5 text-xs"
                  onClick={handleAddExperience}
                  disabled={draftContent.experience.length >= MAX_EXPERIENCE_ITEMS}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add Experience
                </Button>
              </div>
              {draftContent.experience.length ? (
                draftContent.experience.map((item, index) => (
                  <div key={`${item.company}-${index}`} className="rounded-xl border border-slate-200 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-800">Experience #{index + 1}</p>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-8 rounded-lg px-2 text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                          onClick={() => handleMoveExperience(index, "up")}
                          disabled={index === 0}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-8 rounded-lg px-2 text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                          onClick={() => handleMoveExperience(index, "down")}
                          disabled={index === draftContent.experience.length - 1}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-8 rounded-lg px-2 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                          onClick={() => handleRemoveExperience(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input
                        placeholder="Company"
                        value={item.company}
                        onChange={(event) =>
                          setDraftContent((current) => {
                            if (!current) return current;
                            const experience = [...current.experience];
                            experience[index] = { ...experience[index], company: event.target.value };
                            return { ...current, experience };
                          })
                        }
                      />
                      <Input
                        placeholder="Role"
                        value={item.role}
                        onChange={(event) =>
                          setDraftContent((current) => {
                            if (!current) return current;
                            const experience = [...current.experience];
                            experience[index] = { ...experience[index], role: event.target.value };
                            return { ...current, experience };
                          })
                        }
                      />
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-3">
                      <Input
                        placeholder="Location"
                        value={item.location}
                        onChange={(event) =>
                          setDraftContent((current) => {
                            if (!current) return current;
                            const experience = [...current.experience];
                            experience[index] = { ...experience[index], location: event.target.value };
                            return { ...current, experience };
                          })
                        }
                      />
                      <Input
                        placeholder="Start Date"
                        value={item.startDate}
                        onChange={(event) =>
                          setDraftContent((current) => {
                            if (!current) return current;
                            const experience = [...current.experience];
                            experience[index] = { ...experience[index], startDate: event.target.value };
                            return { ...current, experience };
                          })
                        }
                      />
                      <Input
                        placeholder="End Date"
                        value={item.endDate}
                        onChange={(event) =>
                          setDraftContent((current) => {
                            if (!current) return current;
                            const experience = [...current.experience];
                            experience[index] = { ...experience[index], endDate: event.target.value };
                            return { ...current, experience };
                          })
                        }
                      />
                    </div>
                    <Textarea
                      rows={4}
                      className="mt-2"
                      placeholder="Impact bullets (one per line)"
                      value={toTextAreaValue(item.bullets)}
                      onChange={(event) =>
                        setDraftContent((current) => {
                          if (!current) return current;
                          const experience = [...current.experience];
                          experience[index] = { ...experience[index], bullets: fromTextAreaValue(event.target.value) };
                          return { ...current, experience };
                        })
                      }
                    />
                  </div>
                ))
              ) : (
                <p className="rounded-xl border border-dashed border-slate-300 p-3 text-sm text-slate-600">
                  No experience entries yet. Click Add Experience to add internships or work history.
                </p>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Label className="text-sm font-semibold text-slate-800">Projects</Label>
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 rounded-lg bg-white px-2.5 text-xs"
                  onClick={handleAddProject}
                  disabled={draftContent.projects.length >= MAX_PROJECT_ITEMS}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add Project
                </Button>
              </div>
              {draftContent.projects.length ? (
                draftContent.projects.map((project, index) => (
                  <div key={`${project.name}-${index}`} className="rounded-xl border border-slate-200 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-800">Project #{index + 1}</p>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-8 rounded-lg px-2 text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                          onClick={() => handleMoveProject(index, "up")}
                          disabled={index === 0}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-8 rounded-lg px-2 text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                          onClick={() => handleMoveProject(index, "down")}
                          disabled={index === draftContent.projects.length - 1}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-8 rounded-lg px-2 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                          onClick={() => handleRemoveProject(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input
                        placeholder="Project Name"
                        value={project.name}
                        onChange={(event) =>
                          setDraftContent((current) => {
                            if (!current) return current;
                            const projects = [...current.projects];
                            projects[index] = { ...projects[index], name: event.target.value };
                            return { ...current, projects };
                          })
                        }
                      />
                      <Input
                        placeholder="Project Role"
                        value={project.role}
                        onChange={(event) =>
                          setDraftContent((current) => {
                            if (!current) return current;
                            const projects = [...current.projects];
                            projects[index] = { ...projects[index], role: event.target.value };
                            return { ...current, projects };
                          })
                        }
                      />
                    </div>
                    <Input
                      className="mt-2"
                      placeholder="Project Link (optional)"
                      value={project.link || ""}
                      onChange={(event) =>
                        setDraftContent((current) => {
                          if (!current) return current;
                          const projects = [...current.projects];
                          projects[index] = { ...projects[index], link: event.target.value };
                          return { ...current, projects };
                        })
                      }
                    />
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <Textarea
                        rows={3}
                        placeholder="Tech stack (one per line)"
                        value={toTextAreaValue(project.tech)}
                        onChange={(event) =>
                          setDraftContent((current) => {
                            if (!current) return current;
                            const projects = [...current.projects];
                            projects[index] = { ...projects[index], tech: fromTextAreaValue(event.target.value) };
                            return { ...current, projects };
                          })
                        }
                      />
                      <Textarea
                        rows={3}
                        placeholder="Project bullets (one per line)"
                        value={toTextAreaValue(project.bullets)}
                        onChange={(event) =>
                          setDraftContent((current) => {
                            if (!current) return current;
                            const projects = [...current.projects];
                            projects[index] = { ...projects[index], bullets: fromTextAreaValue(event.target.value) };
                            return { ...current, projects };
                          })
                        }
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-xl border border-dashed border-slate-300 p-3 text-sm text-slate-600">
                  No project entries yet. Click Add Project to include personal, internship, or client projects.
                </p>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Label className="text-sm font-semibold text-slate-800">Education</Label>
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 rounded-lg bg-white px-2.5 text-xs"
                  onClick={handleAddEducation}
                  disabled={draftContent.education.length >= MAX_EDUCATION_ITEMS}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add Education
                </Button>
              </div>
              {draftContent.education.length ? (
                draftContent.education.map((item, index) => (
                  <div key={`${item.institution}-${index}`} className="rounded-xl border border-slate-200 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-800">Education #{index + 1}</p>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-8 rounded-lg px-2 text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                          onClick={() => handleMoveEducation(index, "up")}
                          disabled={index === 0}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-8 rounded-lg px-2 text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                          onClick={() => handleMoveEducation(index, "down")}
                          disabled={index === draftContent.education.length - 1}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-8 rounded-lg px-2 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                          onClick={() => handleRemoveEducation(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input
                        placeholder="Institution"
                        value={item.institution}
                        onChange={(event) =>
                          setDraftContent((current) => {
                            if (!current) return current;
                            const education = [...current.education];
                            education[index] = { ...education[index], institution: event.target.value };
                            return { ...current, education };
                          })
                        }
                      />
                      <Input
                        placeholder="Degree"
                        value={item.degree}
                        onChange={(event) =>
                          setDraftContent((current) => {
                            if (!current) return current;
                            const education = [...current.education];
                            education[index] = { ...education[index], degree: event.target.value };
                            return { ...current, education };
                          })
                        }
                      />
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <Input
                        placeholder="Start Date"
                        value={item.startDate}
                        onChange={(event) =>
                          setDraftContent((current) => {
                            if (!current) return current;
                            const education = [...current.education];
                            education[index] = { ...education[index], startDate: event.target.value };
                            return { ...current, education };
                          })
                        }
                      />
                      <Input
                        placeholder="End Date"
                        value={item.endDate}
                        onChange={(event) =>
                          setDraftContent((current) => {
                            if (!current) return current;
                            const education = [...current.education];
                            education[index] = { ...education[index], endDate: event.target.value };
                            return { ...current, education };
                          })
                        }
                      />
                    </div>
                    <Textarea
                      rows={3}
                      className="mt-2"
                      placeholder="Education details (one per line)"
                      value={toTextAreaValue(item.details)}
                      onChange={(event) =>
                        setDraftContent((current) => {
                          if (!current) return current;
                          const education = [...current.education];
                          education[index] = { ...education[index], details: fromTextAreaValue(event.target.value) };
                          return { ...current, education };
                        })
                      }
                    />
                  </div>
                ))
              ) : (
                <p className="rounded-xl border border-dashed border-slate-300 p-3 text-sm text-slate-600">
                  No education entries yet. Click Add Education to include degrees or certifications.
                </p>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label>Core Skills (one per line)</Label>
                <Textarea
                  rows={5}
                  value={toTextAreaValue(draftContent.skills.core)}
                  onChange={(event) =>
                    setDraftContent((current) =>
                      current
                        ? { ...current, skills: { ...current.skills, core: fromTextAreaValue(event.target.value) } }
                        : current
                    )
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Tools (one per line)</Label>
                <Textarea
                  rows={5}
                  value={toTextAreaValue(draftContent.skills.tools)}
                  onChange={(event) =>
                    setDraftContent((current) =>
                      current
                        ? { ...current, skills: { ...current.skills, tools: fromTextAreaValue(event.target.value) } }
                        : current
                    )
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Soft Skills (one per line)</Label>
                <Textarea
                  rows={5}
                  value={toTextAreaValue(draftContent.skills.soft)}
                  onChange={(event) =>
                    setDraftContent((current) =>
                      current
                        ? { ...current, skills: { ...current.skills, soft: fromTextAreaValue(event.target.value) } }
                        : current
                    )
                  }
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Label className="text-sm font-semibold text-slate-800">Certifications</Label>
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 rounded-lg bg-white px-2.5 text-xs"
                  onClick={handleAddCertification}
                  disabled={draftContent.certifications.length >= MAX_CERTIFICATION_ITEMS}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add Certification
                </Button>
              </div>
              {draftContent.certifications.length ? (
                <div className="space-y-2">
                  {draftContent.certifications.map((certification, index) => (
                    <div key={`${index}-${certification}`} className="flex items-center gap-2">
                      <Input
                        placeholder="Certification"
                        value={certification}
                        onChange={(event) =>
                          setDraftContent((current) => {
                            if (!current) return current;
                            const certifications = [...current.certifications];
                            certifications[index] = event.target.value;
                            return { ...current, certifications };
                          })
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-9 rounded-lg px-2 text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                        onClick={() => handleMoveCertification(index, "up")}
                        disabled={index === 0}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-9 rounded-lg px-2 text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                        onClick={() => handleMoveCertification(index, "down")}
                        disabled={index === draftContent.certifications.length - 1}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-9 rounded-lg px-2 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                        onClick={() => handleRemoveCertification(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-slate-300 p-3 text-sm text-slate-600">
                  No certifications yet. Click Add Certification to add them.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button onClick={handleSaveEdits} disabled={saving} className="h-11 rounded-xl">
                {saving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Edits
              </Button>
              <Button
                variant="outline"
                className="h-11 rounded-xl bg-white"
                onClick={() => setDraftContent(cloneContent(activeVersion.content))}
              >
                Reset to Generated
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}
