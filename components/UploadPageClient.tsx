"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp } from "lucide-react";

import LoadingSpinner from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { JOB_ROLES } from "@/lib/constants";
import { normalizeUiError } from "@/lib/ui-error";

export default function UploadPageClient() {
  const router = useRouter();

  const [jobRole, setJobRole] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  return (
    <div className="container py-6 sm:py-8 md:py-12">
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">ATS Intake</p>
        <h1 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">Upload Resume</h1>
        <p className="mt-1 text-sm text-slate-600 sm:text-base">
          Upload your file and get role-specific ATS insights in one flow.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <Card className="bg-white/90">
          <CardHeader>
            <CardTitle className="font-display text-xl sm:text-2xl">Upload Resume</CardTitle>
            <CardDescription>
              Upload a PDF or DOCX file and select the target job role to generate ATS analysis.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 sm:space-y-6">
            <div className="space-y-2">
              <Label htmlFor="jobRole" className="text-sm font-semibold text-slate-700">
                Target Job Role
              </Label>
              <Select value={jobRole} onValueChange={setJobRole}>
                <SelectTrigger id="jobRole" className="h-11 sm:h-12">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {JOB_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="resume" className="text-sm font-semibold text-slate-700">
                Resume File
              </Label>
              <input
                id="resume"
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="block w-full rounded-xl border border-slate-200 bg-white/92 p-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-50 file:px-3 file:py-1.5 file:font-semibold file:text-cyan-700 hover:file:bg-cyan-100"
                onChange={(event) => {
                  const selected = event.target.files?.[0];
                  setFile(selected || null);
                }}
              />
              <p className="text-xs text-slate-500">Max size: 5MB. Allowed: PDF, DOCX.</p>
            </div>

            <Button
              disabled={loading}
              className="h-11 w-full text-base sm:h-12"
              onClick={async () => {
                setError("");

                if (!jobRole) {
                  setError("Please select a job role.");
                  return;
                }

                if (!file) {
                  setError("Please upload a resume file.");
                  return;
                }

                setLoading(true);

                try {
                  setStatus("Uploading resume...");
                  const formData = new FormData();
                  formData.append("file", file);
                  formData.append("jobRole", jobRole);

                  const uploadResponse = await fetch("/api/upload", {
                    method: "POST",
                    body: formData
                  });

                  const uploadData = await uploadResponse.json();

                  if (!uploadResponse.ok) {
                    throw new Error(uploadData.error || "Upload failed.");
                  }

                  setStatus("Running AI ATS analysis...");
                  const analyzeResponse = await fetch("/api/analyze", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      resumeId: uploadData.resumeId,
                      jobRole
                    })
                  });

                  const analyzeData = await analyzeResponse.json();

                  if (!analyzeResponse.ok) {
                    throw new Error(analyzeData.error || "Analysis failed.");
                  }

                  router.push(`/report/${uploadData.resumeId}`);
                } catch (err) {
                  setError(normalizeUiError(err, "analysis"));
                } finally {
                  setLoading(false);
                  setStatus("");
                }
              }}
            >
              <FileUp className="mr-2 h-4 w-4" />
              {loading ? "Processing..." : "Upload & Analyze"}
            </Button>

            {loading ? <LoadingSpinner label={status} /> : null}
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          </CardContent>
        </Card>

        <Card className="h-fit bg-[linear-gradient(180deg,rgba(236,254,255,0.95)_0%,rgba(255,255,255,0.92)_100%)]">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-lg">Quick Tips</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <p className="rounded-xl border border-cyan-200/60 bg-cyan-50/75 p-3">
              Use a recent resume version tailored to the role you are applying for.
            </p>
            <p className="rounded-xl border border-teal-200/60 bg-teal-50/75 p-3">Keep file size below 5MB for faster analysis.</p>
            <p className="rounded-xl border border-sky-200/60 bg-sky-50/75 p-3">
              Include measurable achievements to improve ATS and recruiter relevance.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
