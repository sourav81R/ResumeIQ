import { NextRequest, NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth-server";
import { getUserResumes } from "@/lib/resume-store";

export async function GET(request: NextRequest) {
  try {
    const user = await requireApiUser(request);
    const resumes = await getUserResumes(user.uid);

    return NextResponse.json({ resumes });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}


