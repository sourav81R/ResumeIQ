import { Progress } from "@/components/ui/progress";

type ATSBreakdownProps = {
  keywordMatch: number;
  skillMatch: number;
  formattingScore: number;
  experienceScore: number;
  educationScore: number;
};

type BreakdownItem = {
  key: keyof ATSBreakdownProps;
  label: string;
  weight: number;
  description: string;
};

const ITEMS: BreakdownItem[] = [
  {
    key: "keywordMatch",
    label: "Keyword Match",
    weight: 0.3,
    description: "How closely your resume language matches the role terms."
  },
  {
    key: "skillMatch",
    label: "Skills Match",
    weight: 0.25,
    description: "Coverage of technical and domain skills requested in the role."
  },
  {
    key: "formattingScore",
    label: "Formatting",
    weight: 0.15,
    description: "Readability and ATS-friendly structure."
  },
  {
    key: "experienceScore",
    label: "Experience Relevance",
    weight: 0.2,
    description: "Alignment of your work history with the target role."
  },
  {
    key: "educationScore",
    label: "Education Match",
    weight: 0.1,
    description: "Fit of education credentials with job requirements."
  }
];

function scoreState(value: number) {
  if (value >= 80) {
    return {
      label: "Strong",
      badgeClassName: "border-emerald-200 bg-emerald-50 text-emerald-700",
      valueClassName: "text-emerald-700"
    };
  }

  if (value >= 60) {
    return {
      label: "Needs Work",
      badgeClassName: "border-amber-200 bg-amber-50 text-amber-700",
      valueClassName: "text-amber-700"
    };
  }

  return {
    label: "Weakness",
    badgeClassName: "border-rose-200 bg-rose-50 text-rose-700",
    valueClassName: "text-rose-700"
  };
}

function clampPercentage(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function percentageLabel(weight: number) {
  return `${Math.round(weight * 100)}%`;
}

export default function ATSBreakdown(props: ATSBreakdownProps) {
  return (
    <div className="space-y-4">
      {ITEMS.map((item) => {
        const value = clampPercentage(props[item.key]);
        const state = scoreState(value);
        const contribution = Math.round(value * item.weight);

        return (
          <div key={item.key} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                <p className="text-xs text-slate-500">{item.description}</p>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                  Weight {percentageLabel(item.weight)}
                </span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${state.badgeClassName}`}
                >
                  {state.label}
                </span>
                <p className={`text-sm font-semibold ${state.valueClassName}`}>{value}%</p>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <Progress value={value} aria-label={`${item.label} score`} />
              <p className="text-xs text-slate-500">
                Weighted contribution: {contribution}/100 points
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}


