import { NextResponse } from "next/server";

import { RESUME_TEMPLATES } from "@/lib/resume-templates";

export async function GET() {
  return NextResponse.json({ templates: RESUME_TEMPLATES });
}
