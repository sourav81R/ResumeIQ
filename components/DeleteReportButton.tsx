"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DeleteReportButtonProps = {
  resumeId: string;
  jobRole: string;
  className?: string;
};

export default function DeleteReportButton({ resumeId, jobRole, className }: DeleteReportButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (isDeleting) {
      return;
    }

    const confirmed = window.confirm(`Delete "${jobRole}" report? This action cannot be undone.`);
    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/report/${resumeId}`, { method: "DELETE" });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "Unable to delete this report.");
      }

      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to delete this report.";
      window.alert(message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={handleDelete}
      disabled={isDeleting}
      aria-label={`Delete ${jobRole} report`}
      title="Delete report"
      className={cn(
        "h-8 rounded-md px-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700",
        className
      )}
    >
      {isDeleting ? (
        <span className="inline-flex items-center gap-1">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Deleting...
        </span>
      ) : (
        "Delete"
      )}
    </Button>
  );
}
