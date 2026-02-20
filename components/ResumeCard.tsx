import Link from "next/link";
import { CalendarDays, ChevronRight } from "lucide-react";
import { format } from "date-fns";

import DeleteReportButton from "@/components/DeleteReportButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AnalysisSource, ResumeRecord } from "@/types";

type ResumeCardProps = {
  resume: ResumeRecord;
};

function scoreVariant(score: number): "success" | "warning" | "danger" {
  if (score >= 80) return "success";
  if (score >= 60) return "warning";
  return "danger";
}

function analysisSourceLabel(source?: AnalysisSource) {
  if (source === "gemini") return "Gemini";
  if (source === "openai") return "OpenAI";
  if (source === "heuristic") return "Heuristic";
  return "Unknown";
}

export default function ResumeCard({ resume }: ResumeCardProps) {
  return (
    <div>
      <Card className="h-full bg-white/92 transition hover:-translate-y-0.5 hover:shadow-[0_20px_40px_rgba(2,32,71,0.16)]">
        <CardHeader className="space-y-3 pb-4">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="line-clamp-1 font-display text-base text-slate-900">{resume.jobRole}</CardTitle>
            <div className="flex items-center gap-1.5">
              <Badge variant={scoreVariant(resume.atsScore)} className="px-3 py-1 font-semibold">
                {resume.atsScore}/100
              </Badge>
              <DeleteReportButton resumeId={resume.id} jobRole={resume.jobRole} />
            </div>
          </div>
          <p className="line-clamp-1 text-sm text-slate-500">{resume.fileName}</p>
        </CardHeader>

        <CardContent className="space-y-2 text-sm text-slate-600">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/75 px-2 py-1.5">
            <CalendarDays className="h-4 w-4" />
            {format(new Date(resume.createdAt), "MMM dd, yyyy")}
          </div>
          <p>Analysis Source: {analysisSourceLabel(resume.analysisSource)}</p>
          <p>Keyword Match: {resume.keywordMatch}%</p>
          <p>Skill Match: {resume.skillMatch}%</p>
        </CardContent>

        <CardFooter className="pt-1">
          <Button asChild variant="outline" className="h-11 w-full bg-white">
            <Link href={`/report/${resume.id}`}>
              View Report
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}


