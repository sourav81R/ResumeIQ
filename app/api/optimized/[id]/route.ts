import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { calculateATSScore } from "@/lib/atsScoring";
import { requireApiUser } from "@/lib/auth-server";
import { getOptimizedResumeById, updateOptimizedResumeVersion } from "@/lib/optimized-resume-store";
import { updateOptimizedResumeSchema } from "@/lib/validations";

type Params = {
  params: {
    id: string;
  };
};

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const user = await requireApiUser(request);
    const version = await getOptimizedResumeById(params.id);

    if (!version) {
      return NextResponse.json({ error: "Optimized resume not found." }, { status: 404 });
    }

    if (version.userId !== user.uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ optimizedResume: version });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const user = await requireApiUser(request);
    const version = await getOptimizedResumeById(params.id);

    if (!version) {
      return NextResponse.json({ error: "Optimized resume not found." }, { status: 404 });
    }

    if (version.userId !== user.uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { content } = updateOptimizedResumeSchema.parse(body);

    const recalculatedScores = {
      ...version.scores,
      atsScore: calculateATSScore({
        keywordMatch: version.scores.keywordMatch,
        skillMatch: version.scores.skillMatch,
        formattingScore: version.scores.formattingScore,
        experienceScore: version.scores.experienceScore,
        educationScore: version.scores.educationScore
      })
    };

    const improvementScore = Math.max(0, recalculatedScores.atsScore - version.previousAtsScore);

    await updateOptimizedResumeVersion(params.id, {
      content,
      scores: recalculatedScores,
      improvementScore
    });

    const updated = await getOptimizedResumeById(params.id);
    if (!updated) {
      return NextResponse.json({ error: "Unable to load updated optimized resume." }, { status: 500 });
    }

    return NextResponse.json({ optimizedResume: updated });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid payload." }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : "Unable to save optimized resume.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
