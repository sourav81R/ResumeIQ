import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Download, MoveLeft } from "lucide-react";

import ATSBreakdown from "@/components/ATSBreakdown";
import ResumeOptimizationStudio from "@/components/ResumeOptimizationStudio";
import ScoreChart from "@/components/ScoreChart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerSessionUser } from "@/lib/auth-server";
import { getResumeById } from "@/lib/resume-store";

type PageProps = {
  params: {
    id: string;
  };
};

export default async function ReportPage({ params }: PageProps) {
  const user = await getServerSessionUser();

  if (!user) {
    redirect("/login");
  }

  const resume = await getResumeById(params.id);

  if (!resume) {
    notFound();
  }

  if (resume.userId !== user.uid) {
    redirect("/dashboard");
  }

  return (
    <div className="container py-6 sm:py-8 md:py-10">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="outline" asChild className="h-11 rounded-xl bg-white">
          <Link href="/dashboard">
            <MoveLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>

        <Button asChild className="h-11 rounded-xl">
          <Link href={`/api/report/${resume.id}/download`}>
            <Download className="mr-2 h-4 w-4" />
            Download PDF Report
          </Link>
        </Button>
      </div>

      <div className="mb-6 grid gap-4 xl:grid-cols-[260px_1fr]">
        <Card className="border-cyan-100 bg-gradient-to-b from-cyan-50/85 to-white">
          <CardContent className="pt-6">
            <ScoreChart score={resume.atsScore} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-xl">ATS Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ATSBreakdown
              keywordMatch={resume.keywordMatch}
              skillMatch={resume.skillMatch}
              formattingScore={resume.formattingScore}
              experienceScore={resume.experienceScore}
              educationScore={resume.educationScore}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-xl">Skill Gap Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            {resume.feedback.missingSkills.length ? (
              <ul className="space-y-2 text-sm text-slate-700">
                {resume.feedback.missingSkills.map((skill) => (
                  <li key={skill} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                    {skill}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-600">No critical skill gaps identified.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-xl">AI Improvement Suggestions</CardTitle>
          </CardHeader>
          <CardContent>
            {resume.feedback.suggestions.length ? (
              <ol className="space-y-2 text-sm text-slate-700">
                {resume.feedback.suggestions.map((suggestion, index) => (
                  <li key={suggestion} className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2">
                    {index + 1}. {suggestion}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-slate-600">No suggestions available yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="font-display text-xl">Section-wise Feedback</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
            <p className="mb-1 font-semibold text-slate-900">Summary</p>
            <p className="text-slate-600">{resume.feedback.sectionFeedback.summary || "N/A"}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
            <p className="mb-1 font-semibold text-slate-900">Experience</p>
            <p className="text-slate-600">{resume.feedback.sectionFeedback.experience || "N/A"}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
            <p className="mb-1 font-semibold text-slate-900">Skills</p>
            <p className="text-slate-600">{resume.feedback.sectionFeedback.skills || "N/A"}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
            <p className="mb-1 font-semibold text-slate-900">Education</p>
            <p className="text-slate-600">{resume.feedback.sectionFeedback.education || "N/A"}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm sm:col-span-2 xl:col-span-1">
            <p className="mb-1 font-semibold text-slate-900">Formatting</p>
            <p className="text-slate-600">{resume.feedback.sectionFeedback.formatting || "N/A"}</p>
          </div>
        </CardContent>
      </Card>

      <ResumeOptimizationStudio
        resumeId={resume.id}
        originalAtsScore={resume.atsScore}
        originalResumeText={resume.resumeText}
      />
    </div>
  );
}


