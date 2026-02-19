"use client";

import { Loader2 } from "lucide-react";

export default function LoadingSpinner({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-600">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}


