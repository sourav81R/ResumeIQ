import Link from "next/link";
import { redirect } from "next/navigation";
import { FileSearch, UploadCloud } from "lucide-react";

import ResumeCard from "@/components/ResumeCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerSessionUser } from "@/lib/auth-server";
import { getUserResumes } from "@/lib/resume-store";

export default async function DashboardPage() {
  const user = await getServerSessionUser();

  if (!user) {
    redirect("/login");
  }

  const resumes = await getUserResumes(user.uid);
  const averageScore = resumes.length
    ? Math.round(resumes.reduce((sum, resume) => sum + resume.atsScore, 0) / resumes.length)
    : 0;

  return (
    <div className="container py-8 md:py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Your Resume Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600 sm:text-base">
            Track ATS score trends and review optimization insights.
          </p>
        </div>
        <Button asChild>
          <Link href="/upload">
            <UploadCloud className="mr-2 h-4 w-4" />
            New Analysis
          </Link>
        </Button>
      </div>

      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Resumes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">{resumes.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Average ATS Score</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">{averageScore}</p>
          </CardContent>
        </Card>

        <Card className="sm:col-span-2 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Latest Upload</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="line-clamp-1 text-sm font-medium text-slate-800">{resumes[0]?.fileName || "No uploads yet"}</p>
          </CardContent>
        </Card>
      </section>

      {resumes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileSearch className="mb-3 h-9 w-9 text-slate-400" />
            <p className="text-lg font-semibold text-slate-900">No resume reports yet</p>
            <p className="mt-1 text-sm text-slate-600">Upload your first resume to get ATS scoring and AI suggestions.</p>
            <Button asChild className="mt-4">
              <Link href="/upload">Upload Resume</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {resumes.map((resume) => (
            <ResumeCard key={resume.id} resume={resume} />
          ))}
        </section>
      )}
    </div>
  );
}


