import { NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth-guard";

export async function GET() {
    const auth = await validateAuth(['ADMIN'], false);
    if (auth.error) return auth.error;

    const token = process.env.WHATSAPP_API_TOKEN || process.env.PERMANENT_TOKEN || process.env.ACCESS_TOKEN;
    const apiVersion = process.env.WHATSAPP_API_VERSION || "v20.0";

    if (!token) {
        return NextResponse.json({ error: "Missing WhatsApp API token" }, { status: 500 });
    }

    try {
        // Get WABA ID from token debug info
        const debugRes = await fetch(
            `https://graph.facebook.com/${apiVersion}/debug_token?input_token=${token}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        const debugData = await debugRes.json();
        const systemUserId = debugData?.data?.user_id;

        if (!systemUserId) {
            return NextResponse.json({ error: "Could not resolve WABA from token", debugData }, { status: 400 });
        }

        // Try fetching from owned_whatsapp_business_accounts
        const wabaRes = await fetch(
            `https://graph.facebook.com/${apiVersion}/${systemUserId}/whatsapp_business_accounts`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        const wabaData = await wabaRes.json();
        const wabaId = wabaData?.data?.[0]?.id;

        if (!wabaId) {
            return NextResponse.json({
                templates: [],
                message: "No WhatsApp Business Account linked to this token. Create templates directly in Meta Business Suite.",
                metaUrl: "https://business.facebook.com/wa/manage/message-templates/",
                systemUserId,
                wabaData
            });
        }

        const templatesRes = await fetch(
            `https://graph.facebook.com/${apiVersion}/${wabaId}/message_templates?fields=name,status,category,language,components&limit=50`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        const templatesData = await templatesRes.json();

        return NextResponse.json({
            wabaId,
            templates: templatesData?.data || [],
            total: templatesData?.data?.length || 0,
            metaUrl: `https://business.facebook.com/wa/manage/message-templates/?waba_id=${wabaId}`
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
