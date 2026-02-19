import Link from "next/link";
import { redirect } from "next/navigation";
import { FileSearch, Sparkles, UploadCloud } from "lucide-react";

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
  const latestUpload = resumes[0]?.fileName || "No uploads yet";

  return (
    <div className="container py-6 sm:py-8 md:py-10">
      <div className="mb-6 rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_18px_38px_rgba(2,35,71,0.1)] backdrop-blur sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">Your Resume Dashboard</h1>
            <p className="mt-1 text-sm text-slate-600 sm:text-base">
              Track ATS score trends and review optimization insights.
            </p>
          </div>
          {resumes.length === 0 ? (
            <Button asChild className="h-11 rounded-xl bg-cyan-700 hover:bg-cyan-800 sm:h-12">
              <Link href="/templates">
                <Sparkles className="mr-2 h-4 w-4" />
                Build First Resume
              </Link>
            </Button>
          ) : (
            <Button asChild className="h-11 rounded-xl sm:h-12">
              <Link href="/upload">
                <UploadCloud className="mr-2 h-4 w-4" />
                New Analysis
              </Link>
            </Button>
          )}
        </div>
      </div>

      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-cyan-100 bg-gradient-to-b from-cyan-50/80 to-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-cyan-900">Total Resumes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-cyan-900">{resumes.length}</p>
          </CardContent>
        </Card>

        <Card className="border-teal-100 bg-gradient-to-b from-teal-50/80 to-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-teal-900">Average ATS Score</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-teal-900">{averageScore}</p>
          </CardContent>
        </Card>

        <Card className="border-sky-100 bg-gradient-to-b from-sky-50/80 to-white sm:col-span-2 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-sky-900">Latest Upload</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="line-clamp-1 text-sm font-medium text-slate-800">{latestUpload}</p>
          </CardContent>
        </Card>
      </section>

      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-slate-900 sm:text-xl">Recent Reports</h2>
      </div>

      {resumes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center sm:py-12">
            <div className="mb-4 rounded-full border border-cyan-200 bg-cyan-50 p-4 text-cyan-700">
              <FileSearch className="h-8 w-8" />
            </div>
            <p className="text-xl font-semibold text-slate-900">You don&apos;t have any resumes yet.</p>
            <p className="mt-2 max-w-xl text-sm text-slate-600">
              Start from a professional template and build your first ATS-ready resume directly inside ResumeIQ.
            </p>
            <Button asChild className="mt-5 h-12 rounded-xl bg-cyan-700 px-6 text-base font-semibold hover:bg-cyan-800">
              <Link href="/templates">Select a Template and Build Your First Resume</Link>
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


