"use client";

import { useMemo, useState } from "react";
import { Download, FileUp, Loader2, ScanSearch } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { normalizeUiError } from "@/lib/ui-error";
import { JobMatchResult } from "@/types";

type JobMatchingEngineProps = {
  resumeId: string;
  jobRole: string;
  initialJobMatch?: JobMatchResult;
};

function scoreTone(score: number) {
  if (score >= 80) return "text-emerald-700";
  if (score >= 60) return "text-amber-700";
  return "text-rose-700";
}

export default function JobMatchingEngine({ resumeId, jobRole, initialJobMatch }: JobMatchingEngineProps) {
  const [jobDescriptionText, setJobDescriptionText] = useState(initialJobMatch?.jobDescriptionText || "");
  const [jobDescriptionFile, setJobDescriptionFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<JobMatchResult | null>(initialJobMatch || null);

  const hasResult = Boolean(result);
  const qAPreview = useMemo(() => result?.interviewQA.slice(0, 5) || [], [result]);

  const handleAnalyze = async () => {
    setError("");
    setStatus("");

    if (!jobDescriptionText.trim() && !jobDescriptionFile) {
      setError("Paste a job description or upload a JD PDF/TXT file.");
      return;
    }

    try {
      setLoading(true);
      setStatus("Matching resume with job description...");

      const formData = new FormData();
      if (jobDescriptionText.trim()) {
        formData.append("jobDescription", jobDescriptionText.trim());
      }
      if (jobDescriptionFile) {
        formData.append("jobDescriptionFile", jobDescriptionFile);
      }

      const response = await fetch(`/api/report/${resumeId}/job-match`, {
        method: "POST",
        body: formData
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to match resume with JD.");
      }

      const matched = data.jobMatch as JobMatchResult;
      setResult(matched);
      setJobDescriptionText(matched.jobDescriptionText || jobDescriptionText);
      setStatus("Matching complete. Interview Q&A generated.");
    } catch (err) {
      setStatus("");
      setError(normalizeUiError(err, "job-match"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mt-4 border-indigo-200/70 bg-gradient-to-br from-indigo-50/70 via-white to-cyan-50/40">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-display text-xl">
          <ScanSearch className="h-5 w-5 text-indigo-700" />
          Real-Time Job Matching Engine
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-700">
          Match your resume against a target JD for <span className="font-semibold">{jobRole}</span>, identify
          keyword/skill gaps, and generate 20 interview Q&A tailored to both.
        </p>

        <div className="space-y-2">
          <Label htmlFor="jd-text">Paste Job Description</Label>
          <Textarea
            id="jd-text"
            rows={8}
            placeholder="Paste the full job description text here..."
            value={jobDescriptionText}
            onChange={(event) => setJobDescriptionText(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="jd-file">Or Upload Job Description File (PDF/TXT)</Label>
          <Input
            id="jd-file"
            type="file"
            accept=".pdf,.txt,application/pdf,text/plain"
            onChange={(event) => setJobDescriptionFile(event.target.files?.[0] || null)}
          />
          <p className="text-xs text-slate-500">Max file size: 5MB.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" className="h-10 rounded-xl" disabled={loading} onClick={handleAnalyze}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
            {loading ? "Matching..." : "Match Resume with JD"}
          </Button>

          {hasResult ? (
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl bg-white"
              onClick={() =>
                window.open(
                  `/api/report/${resumeId}/job-match/interview-pdf?ts=${Date.now()}`,
                  "_blank",
                  "noopener,noreferrer"
                )
              }
            >
              <Download className="mr-2 h-4 w-4" />
              Download 20 Q&A PDF
            </Button>
          ) : null}
        </div>

        {status ? <p className="text-sm text-emerald-700">{status}</p> : null}
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        {result ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-xs uppercase tracking-wider text-slate-500">Match Score</p>
                <p className={`mt-1 text-2xl font-bold ${scoreTone(result.matchScore)}`}>{result.matchScore}%</p>
                <Progress value={result.matchScore} className="mt-2" />
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-xs uppercase tracking-wider text-slate-500">Shortlist Probability</p>
                <p className={`mt-1 text-2xl font-bold ${scoreTone(result.shortlistProbability)}`}>
                  {result.shortlistProbability}%
                </p>
                <Progress value={result.shortlistProbability} className="mt-2" />
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-3">
              <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-rose-700">Missing Keywords</p>
                {result.missingKeywords.length ? (
                  <ul className="space-y-1 text-sm text-slate-700">
                    {result.missingKeywords.slice(0, 12).map((item) => (
                      <li key={item} className="list-inside list-disc">
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-600">No critical keyword gaps detected.</p>
                )}
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-700">Required Skills Gap</p>
                {result.requiredSkillsGap.length ? (
                  <ul className="space-y-1 text-sm text-slate-700">
                    {result.requiredSkillsGap.slice(0, 12).map((item) => (
                      <li key={item} className="list-inside list-disc">
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-600">No major skill gaps detected.</p>
                )}
              </div>

              <div className="rounded-xl border border-cyan-200 bg-cyan-50/50 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-cyan-700">Improvement Suggestions</p>
                {result.improvementSuggestions.length ? (
                  <ul className="space-y-1 text-sm text-slate-700">
                    {result.improvementSuggestions.slice(0, 10).map((item) => (
                      <li key={item} className="list-inside list-disc">
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-600">No suggestions available.</p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-indigo-700">
                Interview Q&A Preview ({result.interviewQA.length} generated)
              </p>
              {qAPreview.length ? (
                <div className="space-y-2">
                  {qAPreview.map((item, index) => (
                    <div key={`${index}-${item.question}`} className="rounded-lg border border-indigo-100 bg-white p-2.5">
                      <p className="text-sm font-semibold text-slate-900">
                        Q{index + 1}. {item.question}
                      </p>
                      <p className="mt-1 text-sm text-slate-700">A. {item.answer}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-600">Interview Q&A will appear after matching.</p>
              )}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
