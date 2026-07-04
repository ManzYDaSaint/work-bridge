import { NextRequest, NextResponse } from "next/server";
import { RecommendationService } from "@/services/recommendation.service";
import { validateAuth } from "@/lib/auth-guard";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await validateAuth();
    const userId = auth.userId;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const jobId = params.id;
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 5;

    const similarJobs = await RecommendationService.getSimilarJobs(jobId, { limit });

    return NextResponse.json({ success: true, data: similarJobs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
