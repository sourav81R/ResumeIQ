"use client";

import { Loader2 } from "lucide-react";

export default function LoadingSpinner({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="inline-flex items-center gap-2.5 rounded-full border border-slate-200/85 bg-white/85 px-3 py-1.5 text-sm text-slate-700 shadow-sm backdrop-blur">
      <span className="relative inline-flex h-4 w-4 items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-cyan-700" />
        <span className="absolute -inset-1 rounded-full bg-cyan-400/25 blur-sm" />
      </span>
      <span className="font-medium">{label}</span>
    </div>
  );
}


