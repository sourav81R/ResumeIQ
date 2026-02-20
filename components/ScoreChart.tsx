type ScoreChartProps = {
  score: number;
};

export default function ScoreChart({ score }: ScoreChartProps) {
  const safeScore = Math.max(0, Math.min(100, Math.round(score)));
  const size = 180;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference - (safeScore / 100) * circumference;

  return (
    <div className="relative mx-auto h-[160px] w-[160px] sm:h-[180px] sm:w-[180px]">
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="fill-none stroke-cyan-100/90"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="fill-none stroke-cyan-600"
          style={{ strokeDasharray: circumference, strokeDashoffset: progress }}
        />
      </svg>

      <div className="absolute inset-[20%] flex flex-col items-center justify-center rounded-full border border-cyan-100 bg-white/80 backdrop-blur-sm">
        <p className="font-display text-3xl font-bold text-slate-900 sm:text-4xl">{safeScore}</p>
        <p className="text-xs uppercase tracking-widest text-slate-500">ATS Score</p>
      </div>
    </div>
  );
}


