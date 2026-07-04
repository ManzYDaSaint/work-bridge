import { NextRequest, NextResponse } from "next/server";
import { RecommendationService } from "@/services/recommendation.service";
import { validateAuth } from "@/lib/auth-guard";

export async function GET(req: NextRequest) {
  try {
    const auth = await validateAuth();
    const userId = auth.userId;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");
    const type = searchParams.get("type"); // 'jobs' or 'seekers'
    
    if (!query) return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 });
    if (!type) return NextResponse.json({ error: "Type parameter 'type' (jobs|seekers) is required" }, { status: 400 });

    let results;
    if (type === 'jobs') {
      results = await RecommendationService.semanticSearchJobs(query);
    } else if (type === 'seekers') {
      results = await RecommendationService.semanticSearchSeekers(query);
    } else {
      return NextResponse.json({ error: "Invalid type. Use 'jobs' or 'seekers'." }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
