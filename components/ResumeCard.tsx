import Link from "next/link";
import { CalendarDays, ChevronRight } from "lucide-react";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ResumeRecord } from "@/types";

type ResumeCardProps = {
  resume: ResumeRecord;
};

function scoreVariant(score: number): "success" | "warning" | "danger" {
  if (score >= 80) return "success";
  if (score >= 60) return "warning";
  return "danger";
}

export default function ResumeCard({ resume }: ResumeCardProps) {
  return (
    <div>
      <Card className="h-full border-slate-200 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="line-clamp-1 text-base text-slate-900">{resume.jobRole}</CardTitle>
            <Badge variant={scoreVariant(resume.atsScore)}>{resume.atsScore}/100</Badge>
          </div>
          <p className="line-clamp-1 text-sm text-slate-500">{resume.fileName}</p>
        </CardHeader>

        <CardContent className="space-y-2 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            {format(new Date(resume.createdAt), "MMM dd, yyyy")}
          </div>
          <p>Keyword Match: {resume.keywordMatch}%</p>
          <p>Skill Match: {resume.skillMatch}%</p>
        </CardContent>

        <CardFooter>
          <Button asChild variant="outline" className="w-full">
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


