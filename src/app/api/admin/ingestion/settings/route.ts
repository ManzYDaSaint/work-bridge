import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";
import { emitSystemEvent } from "@/lib/mission-control";
import { SettingActionSchema } from "@/lib/validations/ingestion";
import { logApiError } from "@/lib/api-error-handler";

export async function POST(req: Request) {
    const supabase = getSupabaseAdminClient();
    if (!supabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await req.json();
        const validation = SettingActionSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: "Invalid request data", details: validation.error.format() }, { status: 400 });
        }

        const { settingKey, settingValue } = validation.data;

        await supabase
            .from("system_settings")
            .upsert({
                key: settingKey,
                value: settingValue ? "true" : "false",
                updated_at: new Date().toISOString()
            });

        await emitSystemEvent({
            category: "SYSTEM",
            severity: "INFO",
            event: "SYSTEM_SETTING_TOGGLED",
            message: `System setting ${settingKey} set to ${settingValue}`,
            metadata: { settingKey, settingValue }
        });

        return NextResponse.json({ success: true, message: `Setting ${settingKey} updated.` });
    } catch (err: any) {
        return logApiError(err, { action: "TOGGLE_SETTING" });
    }
}
