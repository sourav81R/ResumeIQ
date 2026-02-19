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

export default function UploadPageClient() {
  const router = useRouter();

  const [jobRole, setJobRole] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  return (
    <div className="container py-8 md:py-12">
      <div className="mx-auto w-full max-w-2xl">
        <Card className="border-slate-200 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Upload Resume</CardTitle>
            <CardDescription>
              Upload a PDF or DOCX file and select the target job role to generate ATS analysis.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="jobRole">Target Job Role</Label>
              <Select value={jobRole} onValueChange={setJobRole}>
                <SelectTrigger id="jobRole">
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
              <Label htmlFor="resume">Resume File</Label>
              <input
                id="resume"
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="block w-full rounded-md border border-slate-200 bg-white p-2 text-sm"
                onChange={(event) => {
                  const selected = event.target.files?.[0];
                  setFile(selected || null);
                }}
              />
              <p className="text-xs text-slate-500">Max size: 5MB. Allowed: PDF, DOCX.</p>
            </div>

            <Button
              disabled={loading}
              className="w-full"
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
                  setError(err instanceof Error ? err.message : "Something went wrong.");
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
      </div>
    </div>
  );
}
