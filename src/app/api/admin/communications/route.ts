import { NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth-guard";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { resend } from "@/lib/resend";
import { sendMetaWhatsAppMessage, logWhatsAppMessage, cleanMetaParamText } from "@/lib/whatsapp-messages";

const BROADCAST_TEMPLATE_NAME = process.env.WHATSAPP_BROADCAST_TEMPLATE || "aganyu_broadcast_announcement";
const BROADCAST_TEMPLATE_LANGUAGE = process.env.WHATSAPP_BROADCAST_LANGUAGE || "en";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_URL || "https://aganyu.com";
const EMAIL_FROM = process.env.RESEND_FROM_EMAIL || "Aganyu <hello@aganyu.com>";

function getEmailConfigError() {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (!apiKey || apiKey === "re_dummy_key") {
        return "Resend is not configured. Set RESEND_API_KEY to a valid key before sending emails.";
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();
    if (!fromEmail || fromEmail === "Aganyu <hello@aganyu.com>") {
        return "RESEND_FROM_EMAIL is not configured. Add a verified sender address from your Resend account, for example: Aganyu <no-reply@yourdomain.com>";
    }

    return null;
}

type Audience = "ALL" | "SEEKERS" | "EMPLOYERS" | "PREMIUM_SEEKERS";
type DeliveryChannel = "EMAIL" | "WHATSAPP" | "BOTH";

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

async function getRecipients(audience: Audience, limit = 5000) {
    const supabase = getSupabaseAdminClient();
    if (!supabase) return [];

    const now = new Date().toISOString();

    let query = supabase
        .from("users")
        .select(`
            id,
            email,
            role,
            job_seekers (
                id,
                full_name,
                phone,
                is_subscribed,
                premium_subscriptions (
                    id,
                    status,
                    ends_at
                )
            )
        `);

    if (audience === "SEEKERS") query = query.eq("role", "JOB_SEEKER");
    if (audience === "EMPLOYERS") query = query.eq("role", "EMPLOYER");

    const { data: users, error } = await query.order("created_at", { ascending: false }).limit(limit);
    if (error) {
        console.error("[getRecipients Error]:", error);
        throw error;
    }

    const results = [];

    for (const user of users || []) {
        const fullEmail = String(user.email || "").trim();
        if (!fullEmail || !fullEmail.includes("@")) continue;

        const seeker = Array.isArray(user.job_seekers) ? user.job_seekers[0] : user.job_seekers;
        const subs: any = seeker?.premium_subscriptions || [];
        const hasActiveSub = Array.isArray(subs)
            ? subs.some((s: any) => s.status === "ACTIVE" && new Date(s.ends_at) > new Date(now))
            : (subs?.status === "ACTIVE" && new Date(subs?.ends_at) > new Date(now));

        const isPremium = hasActiveSub || !!seeker?.is_subscribed;

        if (audience === "PREMIUM_SEEKERS" && !isPremium) {
            continue;
        }

        const localPart = fullEmail.split("@")[0] || "there";
        const firstName = seeker?.full_name?.trim()?.split(" ")[0] || localPart
            .replace(/[._-]+/g, " ")
            .replace(/\b\w/g, (char) => char.toUpperCase())
            .trim();

        results.push({
            user_id: user.id,
            email: fullEmail,
            first_name: firstName,
            phone: seeker?.phone || null,
            is_premium: isPremium,
            role: user.role,
            profile_url: buildProfileUrl(user.role),
        });
    }

    return results;
}

async function getWhatsAppConversations() {
    const supabase = getSupabaseAdminClient();
    if (!supabase) return [];

    let messages: any[] = [];

    try {
        const { data: dbMessages } = await supabase
            .from("whatsapp_messages")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(100);

        messages = dbMessages || [];
    } catch {
        try {
            const { data: logs } = await supabase
                .from("whatsapp_delivery_logs")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(100);

            messages = (logs || []).map((l: any) => ({
                id: l.id,
                phone: l.metadata?.phone || "Unknown",
                direction: l.error?.startsWith("INBOUND:") ? "INBOUND" : "OUTBOUND",
                message_text: l.error?.replace("INBOUND:", "").trim() || "Notification Sent",
                status: l.status,
                created_at: l.created_at
            }));
        } catch {
            messages = [];
        }
    }

    const conversationMap = new Map<string, any>();

    for (const msg of messages) {
        const phoneKey = msg.phone || "Unknown";
        if (!conversationMap.has(phoneKey)) {
            conversationMap.set(phoneKey, {
                phone: phoneKey,
                user_id: msg.user_id || null,
                last_message: msg.message_text,
                last_direction: msg.direction,
                updated_at: msg.created_at,
                unread_count: msg.direction === "INBOUND" ? 1 : 0,
                messages: []
            });
        }
        conversationMap.get(phoneKey).messages.push(msg);
    }

    const conversations = Array.from(conversationMap.values());
    
    const { data: seekers } = await supabase
        .from("job_seekers")
        .select("id, user_id, full_name, phone, is_subscribed");

    const seekerPhoneMap = new Map<string, any>();
    (seekers || []).forEach((s: any) => {
        if (s.phone) {
            const rawDigits = String(s.phone).replace(/\D/g, "");
            seekerPhoneMap.set(rawDigits, s);
            seekerPhoneMap.set(s.phone, s);
        }
    });

    conversations.forEach((c) => {
        const rawPhoneDigits = String(c.phone).replace(/\D/g, "");
        const seeker = seekerPhoneMap.get(rawPhoneDigits) || seekerPhoneMap.get(c.phone);
        if (seeker) {
            c.first_name = seeker.full_name || "WhatsApp User";
            c.is_premium = !!seeker.is_subscribed;
        } else {
            c.first_name = "WhatsApp User";
            c.is_premium = false;
        }
    });

    return conversations;
}

export async function GET(request: Request) {
    const auth = await validateAuth(["ADMIN"], false);
    if (auth.error) return auth.error;

    try {
        const { searchParams } = new URL(request.url);
        const broadcastId = searchParams.get("broadcastId");
        const supabase = getSupabaseAdminClient();

        // If broadcastId is provided, return detailed recipient logs for that specific campaign
        if (broadcastId && supabase) {
            try {
                const { data: recipients } = await supabase
                    .from("broadcast_recipients")
                    .select("*")
                    .eq("broadcast_id", broadcastId)
                    .order("created_at", { ascending: true });

                return NextResponse.json({
                    broadcastId,
                    recipients: recipients || []
                });
            } catch (err: any) {
                return NextResponse.json({ error: err.message || "Failed to fetch broadcast recipients" }, { status: 500 });
            }
        }

        const audience = (searchParams.get("audience") as Audience) || "SEEKERS";
        const previewLimit = Number(searchParams.get("limit") || "6");

        const allRecipients = await getRecipients(audience, 5000);
        const conversations = await getWhatsAppConversations();

        const totalAudience = allRecipients.length;
        const totalWithWhatsApp = allRecipients.filter((r) => !!r.phone).length;
        const premiumCount = allRecipients.filter((r) => r.is_premium).length;

        // Fetch recent campaign history if table exists
        let history: any[] = [];
        if (supabase) {
            try {
                const { data: broadcasts } = await supabase
                    .from("campaign_broadcasts")
                    .select("*")
                    .order("created_at", { ascending: false })
                    .limit(20);
                history = broadcasts || [];
            } catch {
                history = [];
            }
        }

        return NextResponse.json({
            audience,
            count: totalAudience,
            whatsappCount: totalWithWhatsApp,
            premiumCount,
            recipients: allRecipients.slice(0, previewLimit).map((r) => ({
                email: r.email,
                first_name: r.first_name,
                phone: r.phone,
                is_premium: r.is_premium,
            })),
            conversations,
            history
        });
    } catch (error: any) {
        console.error("[Admin Communications GET] Error:", error);
        return NextResponse.json({ error: error.message || "Unable to fetch recipients" }, { status: 500 });
    }
}

async function processBroadcastQueue(broadcastId: string, recipients: any[], payload: any) {
    const supabase = getSupabaseAdminClient();
    if (!supabase) return;

    let sentEmail = 0;
    let failedEmail = 0;
    let sentWhatsApp = 0;
    let failedWhatsApp = 0;
    let skippedWhatsApp = 0;

    const { channel, emailSubject, emailBody, whatsappHeading, whatsappBody } = payload;

    for (const recipient of recipients) {
        // 1. Dispatch Email Channel
        if (channel === "EMAIL" || channel === "BOTH") {
            const renderedEmailSubject = replaceTemplateVars(emailSubject, recipient);
            const renderedEmailBody = replaceTemplateVars(emailBody, recipient);
            try {
                const html = toHtmlBody(renderedEmailBody);
                const { error } = await resend.emails.send({
                    from: EMAIL_FROM,
                    to: [recipient.email],
                    subject: renderedEmailSubject,
                    html,
                });

                if (error) {
                    failedEmail += 1;
                    try {
                        await supabase.from("broadcast_recipients").insert({
                            broadcast_id: broadcastId,
                            user_id: recipient.user_id !== "test-admin" ? recipient.user_id : null,
                            email: recipient.email,
                            phone: recipient.phone,
                            channel: "EMAIL",
                            status: "FAILED",
                            error_message: error.message || "Resend error"
                        });
                    } catch {}
                } else {
                    sentEmail += 1;
                    try {
                        await supabase.from("broadcast_recipients").insert({
                            broadcast_id: broadcastId,
                            user_id: recipient.user_id !== "test-admin" ? recipient.user_id : null,
                            email: recipient.email,
                            phone: recipient.phone,
                            channel: "EMAIL",
                            status: "SENT"
                        });
                    } catch {}
                }
            } catch (err: any) {
                failedEmail += 1;
                try {
                    await supabase.from("broadcast_recipients").insert({
                        broadcast_id: broadcastId,
                        user_id: recipient.user_id !== "test-admin" ? recipient.user_id : null,
                        email: recipient.email,
                        phone: recipient.phone,
                        channel: "EMAIL",
                        status: "FAILED",
                        error_message: err.message || "Exception during send"
                    });
                } catch {}
            }
        }

        // 2. Dispatch WhatsApp Channel
        if (channel === "WHATSAPP" || channel === "BOTH") {
            if (!recipient.phone) {
                skippedWhatsApp += 1;
                try {
                    await supabase.from("broadcast_recipients").insert({
                        broadcast_id: broadcastId,
                        user_id: recipient.user_id !== "test-admin" ? recipient.user_id : null,
                        email: recipient.email,
                        phone: null,
                        channel: "WHATSAPP",
                        status: "SKIPPED",
                        error_message: "No registered phone number"
                    });
                } catch {}
            } else {
                try {
                    const renderedHeading = replaceTemplateVars(whatsappHeading, recipient);
                    const renderedBody = replaceTemplateVars(whatsappBody, recipient);
                    const fullMessageContent = renderedHeading
                        ? `*${renderedHeading}*\n\n${renderedBody}`
                        : renderedBody;

                    const buttonSuffix = recipient.role === "EMPLOYER" ? "dashboard/employer" : "dashboard/seeker";

                    const templateComponents = [
                        {
                            type: "body",
                            parameters: [
                                { type: "text", text: cleanMetaParamText(recipient.first_name, 60, false) || "there" },
                                { type: "text", text: cleanMetaParamText(fullMessageContent, 1024, false) }
                            ]
                        },
                        {
                            type: "button",
                            sub_type: "url",
                            index: "0",
                            parameters: [
                                { type: "text", text: buttonSuffix }
                            ]
                        }
                    ];

                    const metaResponse = await sendMetaWhatsAppMessage({
                        to: recipient.phone,
                        templateId: BROADCAST_TEMPLATE_NAME,
                        templateParams: { languageCode: BROADCAST_TEMPLATE_LANGUAGE },
                        components: templateComponents
                    });

                    const waMessageId = metaResponse?.messages?.[0]?.id || null;
                    const messagePreview = `[Template: ${BROADCAST_TEMPLATE_NAME}] ${renderedHeading ? `${renderedHeading} — ` : ""}${renderedBody.slice(0, 100)}`;

                    await logWhatsAppMessage({
                        user_id: recipient.user_id !== "test-admin" ? recipient.user_id : null,
                        phone: recipient.phone,
                        direction: "OUTBOUND",
                        message_text: messagePreview,
                        status: "SENT",
                        metadata: {
                            wa_message_id: waMessageId,
                            template: BROADCAST_TEMPLATE_NAME,
                            subject: renderedHeading
                        }
                    });

                    try {
                        await supabase.from("broadcast_recipients").insert({
                            broadcast_id: broadcastId,
                            user_id: recipient.user_id !== "test-admin" ? recipient.user_id : null,
                            email: recipient.email,
                            phone: recipient.phone,
                            channel: "WHATSAPP",
                            status: "SENT",
                            wa_message_id: waMessageId
                        });
                    } catch {}

                    sentWhatsApp += 1;
                } catch (waErr: any) {
                    failedWhatsApp += 1;
                    console.error("[Admin Communications] WhatsApp dispatch failed for:", recipient.phone, waErr.message);

                    try {
                        await supabase.from("broadcast_recipients").insert({
                            broadcast_id: broadcastId,
                            user_id: recipient.user_id !== "test-admin" ? recipient.user_id : null,
                            email: recipient.email,
                            phone: recipient.phone,
                            channel: "WHATSAPP",
                            status: "FAILED",
                            error_code: String(waErr.code || ""),
                            error_message: waErr.message || "Meta API error"
                        });
                    } catch {}
                }
            }
        }
    }

    // Update broadcast summary
    const finalStatus = (failedEmail > 0 || failedWhatsApp > 0) ? "PARTIAL_FAILURE" : "COMPLETED";
    try {
        await supabase.from("campaign_broadcasts").update({
            status: finalStatus,
            sent_count: sentEmail + sentWhatsApp,
            failed_count: failedEmail + failedWhatsApp,
            skipped_count: skippedWhatsApp,
            completed_at: new Date().toISOString()
        }).eq("id", broadcastId);
    } catch {}
}

export async function POST(request: Request) {
    const auth = await validateAuth(["ADMIN"], false);
    if (auth.error) return auth.error;

    try {
        const body = await request.json();
        const mode = (body.mode as "send" | "test" | "reply") || "send";
        const channel = (body.channel as DeliveryChannel) || "EMAIL";
        const audience = (body.audience as Audience) || "SEEKERS";

        // Handle 1-to-1 Admin Live Reply Mode
        if (mode === "reply") {
            const replyPhone = String(body.replyPhone || "").trim();
            const replyText = String(body.replyText || "").trim();

            if (!replyPhone || !replyText) {
                return NextResponse.json({ error: "Destination phone and message text are required for replies." }, { status: 400 });
            }

            try {
                await sendMetaWhatsAppMessage({
                    to: replyPhone,
                    text: replyText
                });

                await logWhatsAppMessage({
                    phone: replyPhone,
                    direction: "OUTBOUND",
                    message_text: replyText,
                    status: "SENT"
                });

                return NextResponse.json({ success: true, message: "WhatsApp reply sent successfully." });
            } catch (err: any) {
                return NextResponse.json({ error: err.message || "Failed to dispatch WhatsApp reply." }, { status: 500 });
            }
        }

        const emailSubject = String(body.emailSubject || body.subject || "").trim();
        const emailBody = String(body.emailBody || body.body || "").trim();
        const whatsappHeading = String(body.whatsappHeading || body.subject || "").trim();
        const whatsappBody = String(body.whatsappBody || body.body || "").trim();

        if (channel === "EMAIL" || channel === "BOTH") {
            if (!emailSubject || !emailBody) {
                return NextResponse.json({ error: "Email subject and message body are required." }, { status: 400 });
            }
            const emailError = getEmailConfigError();
            if (emailError) {
                return NextResponse.json({ error: emailError }, { status: 500 });
            }
        }

        if (channel === "WHATSAPP" || channel === "BOTH") {
            if (!whatsappBody) {
                return NextResponse.json({ error: "WhatsApp message body is required." }, { status: 400 });
            }
        }

        let recipients = await getRecipients(audience, 5000);

        if (mode === "test") {
            const testEmail = String(body.testEmail || "").trim();
            const testPhone = String(body.testPhone || "").trim();

            if ((channel === "EMAIL" || channel === "BOTH") && (!testEmail || !testEmail.includes("@"))) {
                return NextResponse.json({ error: "A valid test email is required for Email test mode." }, { status: 400 });
            }
            if ((channel === "WHATSAPP" || channel === "BOTH") && !testPhone) {
                return NextResponse.json({ error: "A valid test phone number is required for WhatsApp test mode." }, { status: 400 });
            }

            recipients = [{
                user_id: "test-admin",
                email: testEmail || "admin@example.com",
                first_name: "Admin",
                phone: testPhone || null,
                is_premium: true,
                role: "JOB_SEEKER",
                profile_url: `${APP_URL}/dashboard/seeker/profile`,
            }];
        }

        // Create campaign broadcast DB record
        const supabase = getSupabaseAdminClient();
        let broadcastId = null;
        if (supabase && mode === "send") {
            try {
                const { data: bRecord } = await supabase.from("campaign_broadcasts").insert({
                    created_by: auth.user?.id || null,
                    audience,
                    channel,
                    template_name: BROADCAST_TEMPLATE_NAME,
                    email_subject: emailSubject,
                    email_body: emailBody,
                    whatsapp_heading: whatsappHeading,
                    whatsapp_body: whatsappBody,
                    status: "PROCESSING",
                    total_recipients: recipients.length
                }).select("id").single();

                broadcastId = bRecord?.id || null;
            } catch {
                // Ignore queue creation failure, fallback to direct execution
            }
        }

        // Trigger background processing asynchronously without awaiting for response to complete (prevents API timeout)
        void processBroadcastQueue(broadcastId || "test-run", recipients, {
            channel,
            emailSubject,
            emailBody,
            whatsappHeading,
            whatsappBody
        });

        return NextResponse.json({
            success: true,
            broadcastId,
            audience,
            channel,
            mode,
            message: mode === "test" ? "Test campaign queued." : `Campaign queued for processing to ${recipients.length} recipients.`,
            total: recipients.length,
        });
    } catch (error: any) {
        console.error("[Admin Communications POST] Error:", error);
        return NextResponse.json({ error: error.message || "Unable to send communication" }, { status: 500 });
    }
}
