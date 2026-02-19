type ScoreChartProps = {
  score: number;
};

export default function ScoreChart({ score }: ScoreChartProps) {
  const size = 180;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference - (score / 100) * circumference;

  return (
    <div className="relative mx-auto h-[160px] w-[160px] sm:h-[180px] sm:w-[180px]">
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="fill-none stroke-cyan-100"
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

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="font-display text-3xl font-bold text-slate-900 sm:text-4xl">{score}</p>
        <p className="text-xs uppercase tracking-widest text-slate-500">ATS Score</p>
      </div>
    </div>
  );
}


