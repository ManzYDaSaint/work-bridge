import { NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth-guard";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { resend } from "@/lib/resend";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_URL || "https://aganyu.com";
const EMAIL_FROM = process.env.RESEND_FROM_EMAIL || "Aganyu <hello@aganyu.com>";

type Audience = "ALL" | "SEEKERS" | "EMPLOYERS" | "PREMIUM_SEEKERS";

function escapeHtml(value: string) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function toHtmlBody(text: string) {
    const escaped = escapeHtml(text).replace(/\n/g, "<br />");
    return `<div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">${escaped}</div>`;
}

function buildProfileUrl(role: string) {
    if (role === "JOB_SEEKER") return `${APP_URL}/dashboard/seeker/profile`;
    if (role === "EMPLOYER") return `${APP_URL}/dashboard/employer/settings`;
    return `${APP_URL}/login`;
}

function replaceTemplateVars(raw: string, recipient: { first_name: string; role: string; profile_url: string }) {
    return raw
        .replace(/{{first_name}}/gi, recipient.first_name || "there")
        .replace(/{{profile_url}}/gi, recipient.profile_url)
        .replace(/{{company_name}}/gi, recipient.role === "EMPLOYER" ? "your company" : "Aganyu");
}

async function getRecipients(audience: Audience, limit = 20) {
    const supabase = getSupabaseAdminClient();
    if (!supabase) return [] as Array<{ email: string; first_name: string; role: string; profile_url: string }>;

    let query = supabase.from("users").select("id, email, role, plan");

    if (audience === "SEEKERS") {
        query = query.eq("role", "JOB_SEEKER");
    }
    if (audience === "EMPLOYERS") {
        query = query.eq("role", "EMPLOYER");
    }
    if (audience === "PREMIUM_SEEKERS") {
        query = query.eq("role", "JOB_SEEKER").eq("plan", "PREMIUM");
    }

    const { data, error } = await query.order("created_at", { ascending: false }).limit(limit + 25);
    if (error) throw error;

    return (data || [])
        .filter((user: any) => user.email && user.email.includes("@"))
        .map((user: any) => {
            const fullEmail = String(user.email).trim();
            const localPart = fullEmail.split("@")[0] || "there";
            const firstName = localPart
                .replace(/[._-]+/g, " ")
                .replace(/\b\w/g, (char) => char.toUpperCase())
                .trim();

            return {
                email: fullEmail,
                first_name: firstName,
                role: user.role,
                profile_url: buildProfileUrl(user.role),
            };
        });
}

export async function GET(request: Request) {
    const auth = await validateAuth(["ADMIN"], false);
    if (auth.error) return auth.error;

    try {
        const { searchParams } = new URL(request.url);
        const audience = (searchParams.get("audience") as Audience) || "SEEKERS";
        const limit = Number(searchParams.get("limit") || "5");
        const recipients = await getRecipients(audience, limit);

        return NextResponse.json({
            audience,
            count: recipients.length,
            recipients: recipients.slice(0, limit).map((recipient) => ({
                email: recipient.email,
                first_name: recipient.first_name,
            })),
        });
    } catch (error: any) {
        console.error("[Admin Communications GET] Error:", error);
        return NextResponse.json({ error: error.message || "Unable to fetch recipients" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const auth = await validateAuth(["ADMIN"], false);
    if (auth.error) return auth.error;

    try {
        const body = await request.json();
        const audience = (body.audience as Audience) || "SEEKERS";
        const mode = body.mode === "test" ? "test" : "send";
        const subject = String(body.subject || "").trim();
        const rawBody = String(body.body || "").trim();

        if (!subject || !rawBody) {
            return NextResponse.json({ error: "Subject and body are required." }, { status: 400 });
        }

        let recipients = await getRecipients(audience, 5000);

        if (mode === "test") {
            const testEmail = String(body.testEmail || "").trim();
            if (!testEmail || !testEmail.includes("@")) {
                return NextResponse.json({ error: "A valid test email is required." }, { status: 400 });
            }
            recipients = [{
                email: testEmail,
                first_name: "Admin",
                role: "JOB_SEEKER",
                profile_url: `${APP_URL}/dashboard/seeker/profile`,
            }];
        }

        let sent = 0;
        let failed = 0;
        let skipped = 0;

        for (const recipient of recipients) {
            const renderedSubject = replaceTemplateVars(subject, recipient);
            const renderedBody = replaceTemplateVars(rawBody, recipient);
            const html = toHtmlBody(renderedBody);

            try {
                const { error } = await resend.emails.send({
                    from: EMAIL_FROM,
                    to: [recipient.email],
                    subject: renderedSubject,
                    html,
                });

                if (error) {
                    failed += 1;
                    console.error("[Admin Communications] Email failure:", recipient.email, error);
                } else {
                    sent += 1;
                }
            } catch (emailError: any) {
                failed += 1;
                console.error("[Admin Communications] Email exception:", recipient.email, emailError);
            }
        }

        return NextResponse.json({
            success: true,
            audience,
            mode,
            sent,
            failed,
            skipped,
            total: recipients.length,
        });
    } catch (error: any) {
        console.error("[Admin Communications POST] Error:", error);
        return NextResponse.json({ error: error.message || "Unable to send communication" }, { status: 500 });
    }
}
