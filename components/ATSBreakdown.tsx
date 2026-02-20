import { Progress } from "@/components/ui/progress";

type ATSBreakdownProps = {
  keywordMatch: number;
  skillMatch: number;
  formattingScore: number;
  experienceScore: number;
  educationScore: number;
};

const ITEMS: Array<{ key: keyof ATSBreakdownProps; label: string; weight: string }> = [
  { key: "keywordMatch", label: "Keyword Match", weight: "30%" },
  { key: "skillMatch", label: "Skills Match", weight: "25%" },
  { key: "formattingScore", label: "Formatting", weight: "15%" },
  { key: "experienceScore", label: "Experience Relevance", weight: "20%" },
  { key: "educationScore", label: "Education Match", weight: "10%" }
];

function scoreState(value: number) {
  if (value >= 80) {
    return {
      label: "Strong",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700"
    };
  }

  if (value >= 60) {
    return {
      label: "Needs Work",
      className: "border-amber-200 bg-amber-50 text-amber-700"
    };
  }

  return {
    label: "Weakness",
    className: "border-rose-200 bg-rose-50 text-rose-700"
  };
}

export default function ATSBreakdown(props: ATSBreakdownProps) {
  return (
    <div className="space-y-4">
      {ITEMS.map((item) => {
        const value = props[item.key];
        const state = scoreState(value);

        return (
          <div key={item.key} className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/50 p-3">
            <div className="flex items-center justify-between text-sm">
              <p className="font-medium text-slate-700">{item.label}</p>
              <div className="flex items-center gap-2">
                <p className="text-slate-500">
                  {value}% ({item.weight})
                </p>
                <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${state.className}`}>
                  {state.label}
                </span>
              </div>
            </div>
            <Progress value={value} />
          </div>
        );
      })}
    </div>
  );
}


