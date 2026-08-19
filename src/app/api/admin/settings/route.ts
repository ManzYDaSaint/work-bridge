import { NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth-guard";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { setMatchDispatchMode } from "@/lib/notification/settings";
import { recordAuditLog } from "@/lib/audit";

export async function GET() {
    const auth = await validateAuth(['ADMIN'], false);
    if (auth.error) return auth.error;

    const supabase = getSupabaseAdminClient();
    if (!supabase) return NextResponse.json({ error: "Admin client unavailable" }, { status: 500 });

    const { getMatchDispatchMode } = await import("@/lib/notification/settings");

    try {
        // Fetch system settings from DB
        const { data: settings } = await supabase
            .from("system_settings")
            .select("key, value");

        const settingsMap = Object.fromEntries((settings || []).map(s => [s.key, s.value]));

        const dispatchMode = await getMatchDispatchMode();

        return NextResponse.json({
            settings: {
                ADMIN_MATCH_DISPATCH_MODE: dispatchMode,
                MATCH_SCORE_THRESHOLD: settingsMap["MATCH_SCORE_THRESHOLD"] || "50",
                BULK_APPROVE_MIN_SCORE: settingsMap["BULK_APPROVE_MIN_SCORE"] || "80",
                WHATSAPP_DAILY_CAP: settingsMap["WHATSAPP_DAILY_CAP"] || "100",
            }
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const auth = await validateAuth(['ADMIN'], false);
    if (auth.error) return auth.error;

    const supabase = getSupabaseAdminClient();
    if (!supabase) return NextResponse.json({ error: "Admin client unavailable" }, { status: 500 });

    try {
        const body = await request.json();
        const { key, value } = body;

        if (!key || value === undefined) {
            return NextResponse.json({ error: "key and value are required" }, { status: 400 });
        }

        const validKeys = ["MATCH_SCORE_THRESHOLD", "BULK_APPROVE_MIN_SCORE", "WHATSAPP_DAILY_CAP", "ADMIN_MATCH_DISPATCH_MODE"];
        if (!validKeys.includes(key)) {
            return NextResponse.json({ error: "Invalid setting key" }, { status: 400 });
        }

        // Handle dispatch mode specially via settings module
        if (key === "ADMIN_MATCH_DISPATCH_MODE") {
            await setMatchDispatchMode(value as "MANUAL" | "AUTO");
        }

        await supabase.from("system_settings").upsert({
            key,
            value: String(value),
            updated_at: new Date().toISOString()
        }, { onConflict: "key" });

        await recordAuditLog({
            action: "settings_UPDATE",
            path: "/api/admin/settings",
            method: "POST",
            statusCode: 200,
            userId: auth.user.id,
            metadata: { key, value }
        });

        return NextResponse.json({ success: true, key, value });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
