"use client";

import NextImage from "next/image";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Download, Plus, Save, Trash2, UserRound } from "lucide-react";

import LoadingSpinner from "@/components/LoadingSpinner";
import OptimizedResumePreview from "@/components/OptimizedResumePreview";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { OptimizedResumeContent, ResumeTemplate } from "@/types";

const MAX_EXPERIENCE_ITEMS = 12;
const MAX_PROJECT_ITEMS = 12;
const MAX_EDUCATION_ITEMS = 8;
const MAX_CERTIFICATION_ITEMS = 15;
const MAX_PHOTO_FILE_BYTES = 4 * 1024 * 1024;
const PHOTO_DIMENSION = 256;
const MANUAL_RESUME_DRAFT_STORAGE_PREFIX = "resumeiq.manual-resume-draft.v1";

type ManualResumeDraft = {
  content: OptimizedResumeContent;
  resumeId: string;
  versionId: string;
  updatedAt?: string;
};

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

function createInitialContent(): OptimizedResumeContent {
  return {
    header: {
      name: "",
      role: "",
      email: "",
      phone: "",
      location: "",
      links: []
    },
    summary: "",
    experience: [createEmptyExperience()],
    education: [createEmptyEducation()],
    projects: [createEmptyProject()],
    skills: {
      core: [],
      tools: [],
      soft: []
    },
    certifications: []
  };
}

function getUserDraftStorageKey(userId: string) {
  return `${MANUAL_RESUME_DRAFT_STORAGE_PREFIX}:${userId}`;
}

function getTemplateDraftStorageKey(userId: string, templateId: string) {
  return `${MANUAL_RESUME_DRAFT_STORAGE_PREFIX}:${userId}:${templateId}`;
}

function isOptimizedResumeContentDraft(value: unknown): value is OptimizedResumeContent {
  if (!value || typeof value !== "object") {
    return false;
  }

  const content = value as Record<string, unknown>;
  const skills = content.skills as Record<string, unknown> | undefined;

  return Boolean(
    content.header &&
      typeof content.header === "object" &&
      typeof content.summary === "string" &&
      Array.isArray(content.experience) &&
      Array.isArray(content.education) &&
      Array.isArray(content.projects) &&
      skills &&
      typeof skills === "object" &&
      Array.isArray(skills.core) &&
      Array.isArray(skills.tools) &&
      Array.isArray(skills.soft) &&
      Array.isArray(content.certifications)
  );
}

function isManualResumeDraft(value: unknown): value is ManualResumeDraft {
  if (!value || typeof value !== "object") {
    return false;
  }

  const draft = value as Record<string, unknown>;
  return isOptimizedResumeContentDraft(draft.content);
}

type ManualResumeBuilderProps = {
  template: ResumeTemplate;
  userId: string;
};

export default function ManualResumeBuilder({ template, userId }: ManualResumeBuilderProps) {
  const [content, setContent] = useState<OptimizedResumeContent>(() => createInitialContent());
  const [resumeId, setResumeId] = useState("");
  const [versionId, setVersionId] = useState("");
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const isDraftHydrated = useRef(false);
  const userDraftStorageKey = useMemo(() => getUserDraftStorageKey(userId), [userId]);
  const legacyTemplateDraftStorageKey = useMemo(
    () => getTemplateDraftStorageKey(userId, template.id),
    [template.id, userId]
  );

  useEffect(() => {
    isDraftHydrated.current = false;

    try {
      const readDraft = (value: string | null) => {
        if (!value) return null;
        const parsedDraft = JSON.parse(value) as unknown;
        return isManualResumeDraft(parsedDraft) ? parsedDraft : null;
      };

      const directDraft =
        readDraft(window.localStorage.getItem(userDraftStorageKey)) ||
        readDraft(window.localStorage.getItem(legacyTemplateDraftStorageKey));
      let resolvedDraft = directDraft;

      if (!resolvedDraft) {
        for (let index = 0; index < window.localStorage.length; index += 1) {
          const key = window.localStorage.key(index);
          if (!key || !key.startsWith(`${MANUAL_RESUME_DRAFT_STORAGE_PREFIX}:${userId}:`)) {
            continue;
          }

          const candidate = readDraft(window.localStorage.getItem(key));
          if (!candidate) continue;

          if (!resolvedDraft) {
            resolvedDraft = candidate;
            continue;
          }

          const currentTime = Date.parse(String(resolvedDraft.updatedAt || ""));
          const nextTime = Date.parse(String(candidate.updatedAt || ""));
          if (Number.isFinite(nextTime) && (!Number.isFinite(currentTime) || nextTime > currentTime)) {
            resolvedDraft = candidate;
          }
        }
      }

      const rawDraft = resolvedDraft;
      if (!rawDraft) {
        setContent(createInitialContent());
        setResumeId("");
        setVersionId("");
        return;
      }

      setContent(rawDraft.content);
      setResumeId(typeof rawDraft.resumeId === "string" ? rawDraft.resumeId : "");
      setVersionId(typeof rawDraft.versionId === "string" ? rawDraft.versionId : "");
      setStatus("Restored your local draft.");
    } catch {
      setContent(createInitialContent());
      setResumeId("");
      setVersionId("");
    } finally {
      isDraftHydrated.current = true;
    }
  }, [legacyTemplateDraftStorageKey, userDraftStorageKey, userId]);

  useEffect(() => {
    if (!isDraftHydrated.current) {
      return;
    }

    try {
      const draftPayload: ManualResumeDraft = {
        content,
        resumeId,
        versionId,
        updatedAt: new Date().toISOString()
      };
      const serializedDraft = JSON.stringify(draftPayload);
      window.localStorage.setItem(userDraftStorageKey, serializedDraft);
      window.localStorage.setItem(legacyTemplateDraftStorageKey, serializedDraft);
    } catch {
      // Ignore browser storage quota/privacy failures and keep in-memory editing.
    }
  }, [content, legacyTemplateDraftStorageKey, resumeId, userDraftStorageKey, versionId]);

  const canSave = useMemo(
    () => Boolean(content.header.name.trim()) && Boolean(content.header.role.trim()),
    [content.header.name, content.header.role]
  );
  const isBusy = saving || downloading;

  const handlePhotoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

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
      setContent((current) => ({ ...current, header: { ...current.header, photoUrl: optimizedPhoto } }));
      setStatus("Profile photo added. Save changes to keep it.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add profile photo.");
    }
  };

  const saveResume = async () => {
    if (!canSave) {
      setError("Name and role are required before saving.");
      return null;
    }

    try {
      setSaving(true);
      setError("");
      setStatus(resumeId ? "Saving updates..." : "Creating your first resume...");

      const url = resumeId ? `/api/manual-resume/${resumeId}` : "/api/manual-resume";
      const method = resumeId ? "PUT" : "POST";
      const payload = resumeId
        ? { templateId: template.id, versionId, content }
        : { templateId: template.id, content };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to save resume.");
      }

      const savedResumeId = String(data.resumeId || resumeId);
      const savedVersionId = String(data.optimizedResume?.id || versionId);

      setResumeId(savedResumeId);
      setVersionId(savedVersionId);
      setStatus("Resume saved successfully.");
      return savedVersionId;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save resume.");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setDownloading(true);
      setError("");
      setStatus("Preparing PDF...");

      const id = versionId || (await saveResume());
      if (!id) {
        return;
      }

      window.open(`/api/optimized/${id}/download?ts=${Date.now()}`, "_blank", "noopener,noreferrer");
      setStatus("PDF download started.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,560px)]">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="font-display text-xl">Resume Builder</CardTitle>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" className="h-10 rounded-xl bg-white" onClick={saveResume} disabled={isBusy}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : resumeId ? "Save Changes" : "Create Resume"}
              </Button>
              <Button type="button" className="h-10 rounded-xl" onClick={handleDownloadPdf} disabled={isBusy}>
                <Download className="mr-2 h-4 w-4" />
                {downloading ? "Preparing..." : "Download PDF"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isBusy ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <LoadingSpinner label={downloading ? "Preparing PDF..." : resumeId ? "Saving resume..." : "Creating resume..."} />
            </div>
          ) : null}
          {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
          {status ? <p className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-800">{status}</p> : null}
          <p className="text-xs text-slate-600">Draft autosaves in this browser, so refresh/offline won&apos;t lose your edits.</p>

          {template.photoMode === "with-photo" ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <Label>Profile Photo (Optional)</Label>
                  <p className="text-xs text-slate-600">
                    Upload JPG/PNG/WebP to include your photo in preview and downloaded PDF.
                  </p>
                </div>
                {content.header.photoUrl ? (
                  <NextImage
                    src={content.header.photoUrl}
                    alt="Profile preview"
                    width={64}
                    height={64}
                    unoptimized
                    className="h-16 w-16 rounded-lg border border-slate-300 object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-500">
                    <UserRound className="h-7 w-7" />
                  </div>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Input type="file" accept="image/png,image/jpeg,image/webp" onChange={handlePhotoUpload} />
                {content.header.photoUrl ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 rounded-lg bg-white"
                    onClick={() =>
                      setContent((current) => ({ ...current, header: { ...current.header, photoUrl: undefined } }))
                    }
                  >
                    Remove Photo
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input
                value={content.header.name}
                onChange={(event) =>
                  setContent((current) => ({ ...current, header: { ...current.header, name: event.target.value } }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <Input
                value={content.header.role}
                onChange={(event) =>
                  setContent((current) => ({ ...current, header: { ...current.header, role: event.target.value } }))
                }
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                value={content.header.email}
                onChange={(event) =>
                  setContent((current) => ({ ...current, header: { ...current.header, email: event.target.value } }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input
                value={content.header.phone}
                onChange={(event) =>
                  setContent((current) => ({ ...current, header: { ...current.header, phone: event.target.value } }))
                }
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Location</Label>
              <Input
                value={content.header.location}
                onChange={(event) =>
                  setContent((current) => ({ ...current, header: { ...current.header, location: event.target.value } }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Contact Links (one per line)</Label>
              <Textarea
                rows={3}
                value={toTextAreaValue(content.header.links)}
                onChange={(event) =>
                  setContent((current) => ({ ...current, header: { ...current.header, links: fromTextAreaValue(event.target.value) } }))
                }
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Summary</Label>
            <Textarea rows={4} value={content.summary} onChange={(event) => setContent((current) => ({ ...current, summary: event.target.value }))} />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Label className="text-sm font-semibold text-slate-800">Experience</Label>
              <Button
                type="button"
                variant="outline"
                className="h-8 rounded-lg bg-white px-2.5 text-xs"
                onClick={() =>
                  setContent((current) =>
                    current.experience.length >= MAX_EXPERIENCE_ITEMS
                      ? current
                      : { ...current, experience: [...current.experience, createEmptyExperience()] }
                  )
                }
                disabled={content.experience.length >= MAX_EXPERIENCE_ITEMS}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add Experience
              </Button>
            </div>
            {content.experience.map((item, index) => (
              <div key={`exp-${index}`} className="rounded-xl border border-slate-200 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-800">Experience #{index + 1}</p>
                  <div className="flex items-center gap-1">
                    <Button type="button" variant="ghost" className="h-8 rounded-lg px-2" onClick={() => setContent((current) => ({ ...current, experience: moveItem(current.experience, index, index - 1) }))} disabled={index === 0}>
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" className="h-8 rounded-lg px-2" onClick={() => setContent((current) => ({ ...current, experience: moveItem(current.experience, index, index + 1) }))} disabled={index === content.experience.length - 1}>
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-8 rounded-lg px-2 text-rose-700 hover:bg-rose-50"
                      onClick={() =>
                        setContent((current) => ({
                          ...current,
                          experience: current.experience.filter((_, entryIndex) => entryIndex !== index)
                        }))
                      }
                      disabled={content.experience.length === 1}
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
                      setContent((current) => {
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
                      setContent((current) => {
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
                      setContent((current) => {
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
                      setContent((current) => {
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
                      setContent((current) => {
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
                    setContent((current) => {
                      const experience = [...current.experience];
                      experience[index] = { ...experience[index], bullets: fromTextAreaValue(event.target.value) };
                      return { ...current, experience };
                    })
                  }
                />
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Label className="text-sm font-semibold text-slate-800">Education</Label>
              <Button
                type="button"
                variant="outline"
                className="h-8 rounded-lg bg-white px-2.5 text-xs"
                onClick={() =>
                  setContent((current) =>
                    current.education.length >= MAX_EDUCATION_ITEMS
                      ? current
                      : { ...current, education: [...current.education, createEmptyEducation()] }
                  )
                }
                disabled={content.education.length >= MAX_EDUCATION_ITEMS}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add Education
              </Button>
            </div>
            {content.education.map((item, index) => (
              <div key={`edu-${index}`} className="rounded-xl border border-slate-200 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-800">Education #{index + 1}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-8 rounded-lg px-2 text-rose-700 hover:bg-rose-50"
                    onClick={() =>
                      setContent((current) => ({
                        ...current,
                        education: current.education.filter((_, entryIndex) => entryIndex !== index)
                      }))
                    }
                    disabled={content.education.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    placeholder="Institution"
                    value={item.institution}
                    onChange={(event) =>
                      setContent((current) => {
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
                      setContent((current) => {
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
                      setContent((current) => {
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
                      setContent((current) => {
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
                    setContent((current) => {
                      const education = [...current.education];
                      education[index] = { ...education[index], details: fromTextAreaValue(event.target.value) };
                      return { ...current, education };
                    })
                  }
                />
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Label className="text-sm font-semibold text-slate-800">Projects</Label>
              <Button
                type="button"
                variant="outline"
                className="h-8 rounded-lg bg-white px-2.5 text-xs"
                onClick={() =>
                  setContent((current) =>
                    current.projects.length >= MAX_PROJECT_ITEMS
                      ? current
                      : { ...current, projects: [...current.projects, createEmptyProject()] }
                  )
                }
                disabled={content.projects.length >= MAX_PROJECT_ITEMS}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add Project
              </Button>
            </div>
            {content.projects.map((project, index) => (
              <div key={`proj-${index}`} className="rounded-xl border border-slate-200 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-800">Project #{index + 1}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-8 rounded-lg px-2 text-rose-700 hover:bg-rose-50"
                    onClick={() =>
                      setContent((current) => ({
                        ...current,
                        projects: current.projects.filter((_, entryIndex) => entryIndex !== index)
                      }))
                    }
                    disabled={content.projects.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    placeholder="Project Name"
                    value={project.name}
                    onChange={(event) =>
                      setContent((current) => {
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
                      setContent((current) => {
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
                    setContent((current) => {
                      const projects = [...current.projects];
                      projects[index] = { ...projects[index], link: event.target.value };
                      return { ...current, projects };
                    })
                  }
                />
                <Textarea
                  rows={3}
                  className="mt-2"
                  placeholder="Tech Stack (one per line)"
                  value={toTextAreaValue(project.tech)}
                  onChange={(event) =>
                    setContent((current) => {
                      const projects = [...current.projects];
                      projects[index] = { ...projects[index], tech: fromTextAreaValue(event.target.value) };
                      return { ...current, projects };
                    })
                  }
                />
                <Textarea
                  rows={4}
                  className="mt-2"
                  placeholder="Project bullets (one per line)"
                  value={toTextAreaValue(project.bullets)}
                  onChange={(event) =>
                    setContent((current) => {
                      const projects = [...current.projects];
                      projects[index] = { ...projects[index], bullets: fromTextAreaValue(event.target.value) };
                      return { ...current, projects };
                    })
                  }
                />
              </div>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Core Skills (one per line)</Label>
              <Textarea
                rows={4}
                value={toTextAreaValue(content.skills.core)}
                onChange={(event) =>
                  setContent((current) => ({
                    ...current,
                    skills: { ...current.skills, core: fromTextAreaValue(event.target.value) }
                  }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Tools (one per line)</Label>
              <Textarea
                rows={4}
                value={toTextAreaValue(content.skills.tools)}
                onChange={(event) =>
                  setContent((current) => ({
                    ...current,
                    skills: { ...current.skills, tools: fromTextAreaValue(event.target.value) }
                  }))
                }
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Soft Skills (one per line)</Label>
            <Textarea
              rows={3}
              value={toTextAreaValue(content.skills.soft)}
              onChange={(event) =>
                setContent((current) => ({
                  ...current,
                  skills: { ...current.skills, soft: fromTextAreaValue(event.target.value) }
                }))
              }
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Label className="text-sm font-semibold text-slate-800">Certifications (Optional)</Label>
              <Button
                type="button"
                variant="outline"
                className="h-8 rounded-lg bg-white px-2.5 text-xs"
                onClick={() =>
                  setContent((current) =>
                    current.certifications.length >= MAX_CERTIFICATION_ITEMS
                      ? current
                      : { ...current, certifications: [...current.certifications, ""] }
                  )
                }
                disabled={content.certifications.length >= MAX_CERTIFICATION_ITEMS}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add Certification
              </Button>
            </div>
            {content.certifications.length ? (
              <div className="space-y-2">
                {content.certifications.map((certification, index) => (
                  <div key={`cert-${index}`} className="flex gap-2">
                    <Input
                      placeholder="Certification"
                      value={certification}
                      onChange={(event) =>
                        setContent((current) => {
                          const certifications = [...current.certifications];
                          certifications[index] = event.target.value;
                          return { ...current, certifications };
                        })
                      }
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 rounded-lg bg-white px-3"
                      onClick={() =>
                        setContent((current) => ({
                          ...current,
                          certifications: current.certifications.filter((_, entryIndex) => entryIndex !== index)
                        }))
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-600">No certifications added yet.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-lg">Live Preview ({template.name})</CardTitle>
        </CardHeader>
        <CardContent>
          <OptimizedResumePreview content={content} template={template} />
        </CardContent>
      </Card>
    </div>
  );
}
