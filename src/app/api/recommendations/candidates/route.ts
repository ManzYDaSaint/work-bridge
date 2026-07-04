import { NextRequest, NextResponse } from "next/server";
import { RecommendationService } from "@/services/recommendation.service";
import { validateAuth } from "@/lib/auth-guard";

export async function GET(req: NextRequest) {
  try {
    const auth = await validateAuth();
    const userId = auth.userId;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId");
    
    if (!jobId) return NextResponse.json({ error: "jobId is required" }, { status: 400 });

    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 10;
    const threshold = searchParams.get("threshold") ? parseFloat(searchParams.get("threshold")!) : 0.3;

    const candidates = await RecommendationService.discoverTalent(jobId, userId, {
      limit,
      threshold,
    });

    return NextResponse.json({ success: true, data: candidates });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
}
