import { validateAuth } from "@/lib/auth-guard";
import { adminService } from "@/services/adminService";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
    const auth = await validateAuth(['ADMIN'], false);
    if (auth.error) return auth.error;

    try {
        const stats = await adminService.getMarketplaceStats();
        
        const response = NextResponse.json({ stats });
        response.headers.set("Cache-Control", "no-store, max-age=0");
        return response;
    } catch (error) {
        console.error("Admin stats fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
    }
}
