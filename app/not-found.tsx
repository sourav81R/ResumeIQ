import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="font-display text-3xl font-bold text-slate-900 sm:text-4xl">Report Not Found</h1>
      <p className="max-w-lg text-sm text-slate-600 sm:text-base">
        The requested analysis report is unavailable or was removed.
      </p>
      <Button asChild className="rounded-xl">
        <Link href="/dashboard">Back to Dashboard</Link>
      </Button>
    </div>
  );
}


