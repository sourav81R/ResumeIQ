import { cn } from "@/lib/utils";

type LoadingPopupProps = {
  title: string;
  subtitle?: string;
  className?: string;
};

export default function LoadingPopup({
  title,
  subtitle = "Please wait while we prepare everything...",
  className
}: LoadingPopupProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/80 bg-[linear-gradient(165deg,rgba(255,255,255,0.97)_0%,rgba(245,252,255,0.96)_42%,rgba(238,250,250,0.95)_100%)] px-5 py-4 shadow-[0_30px_80px_rgba(2,32,71,0.35)] backdrop-blur-xl",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(56,189,248,0.26),transparent_42%),radial-gradient(circle_at_88%_0%,rgba(20,184,166,0.26),transparent_40%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] overflow-hidden">
        <div className="loading-shimmer-line h-full w-1/2" />
      </div>

      <div className="relative flex items-start gap-3">
        <div className="relative mt-0.5 h-12 w-12 shrink-0">
          <span className="loading-orbit absolute inset-0 rounded-full border-2 border-cyan-300/70 border-t-cyan-600" />
          <span className="loading-orbit-reverse absolute inset-1 rounded-full border-2 border-teal-300/60 border-b-teal-600" />
          <span className="loading-core absolute inset-[14px] rounded-full bg-[linear-gradient(145deg,#0891b2,#0f766e)] shadow-[0_0_20px_rgba(14,165,233,0.55)]" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="loading-title-shimmer truncate text-sm font-semibold">{title}</p>
          <p className="mt-0.5 text-xs text-slate-600">{subtitle}</p>

          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200/85">
            <div className="loading-progress-bar h-full w-1/2 rounded-full bg-[linear-gradient(90deg,#06b6d4,#14b8a6,#0ea5e9)]" />
          </div>

          <div className="mt-2.5 flex items-center gap-1.5">
            <span className="loading-dot h-1.5 w-1.5 rounded-full bg-cyan-500" />
            <span className="loading-dot h-1.5 w-1.5 rounded-full bg-teal-500 [animation-delay:120ms]" />
            <span className="loading-dot h-1.5 w-1.5 rounded-full bg-sky-500 [animation-delay:240ms]" />
          </div>
        </div>
      </div>
    </div>
  );
}
