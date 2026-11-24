import { validateAuth } from "@/lib/auth-guard";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { CRMService } from "@/lib/crm/crm-service";
import { emitSystemEvent } from "@/lib/mission-control";
import { resend } from "@/lib/resend";
import { getSiteUrl } from "@/lib/site-url";
import crypto from "crypto";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
    const auth = await validateAuth(["ADMIN"], false);
    if (auth.error) return auth.error;

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
        return NextResponse.json({ error: "Database client unavailable" }, { status: 500 });
    }

    try {
        const body = await request.json();
        const { employerId, recipientEmail } = body;

        if (!employerId) {
            return NextResponse.json({ error: "Employer ID is required." }, { status: 400 });
        }

        // 1. Fetch employer
        const { data: employer, error: empErr } = await supabase
            .from("employers")
            .select("id, company_name, recruitment_email, account_type, user_id")
            .eq("id", employerId)
            .single();

        if (empErr || !employer) {
            return NextResponse.json({ error: "Employer record not found." }, { status: 404 });
        }

        if (employer.user_id || (employer.account_type && employer.account_type !== "LEAD")) {
            return NextResponse.json({ error: "This employer has already registered and is active." }, { status: 400 });
        }

        const emailToUse = (recipientEmail || employer.recruitment_email || "").trim().toLowerCase();
        if (!emailToUse || !emailToUse.includes("@")) {
            return NextResponse.json({
                error: "A valid recruitment or HR email is required to send a claim invitation."
            }, { status: 400 });
        }

        // 2. Generate secure token
        const rawToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

        // 3. Save token hash and email on employer record
        const { error: updateErr } = await supabase
            .from("employers")
            .update({
                claim_token_hash: tokenHash,
                claim_token_expires_at: expiresAt,
                recruitment_email: emailToUse,
            })
            .eq("id", employer.id);

        if (updateErr) throw updateErr;

        // 3.5. Calculate candidate interest teaser metrics
        const { data: employerJobs } = await supabase
            .from("jobs")
            .select("id, title")
            .eq("employer_id", employer.id)
            .eq("status", "ACTIVE");

        const activeJobCount = employerJobs?.length || 0;
        const jobIds = (employerJobs || []).map(j => j.id);

        let applicationCount = 0;
        if (jobIds.length > 0) {
            const { count } = await supabase
                .from("applications")
                .select("id", { count: "exact", head: true })
                .in("jobId", jobIds);
            applicationCount = count || 0;
        }

        // 4. Send email via Resend
        const appUrl = getSiteUrl();
        const claimUrl = `${appUrl}/register?claim_token=${rawToken}`;
        const emailFrom = process.env.RESEND_FROM_EMAIL || "Aganyu Employer Relations <hello@aganyu.com>";

        const sampleJobTitles = (employerJobs || [])
            .slice(0, 3)
            .map(j => `<li><strong>${j.title}</strong></li>`)
            .join("");

        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
                <h2 style="color: #0f172a;">Recruitment opportunities for ${employer.company_name} on Aganyu</h2>
                <p>Hello,</p>
                <p>We are reaching out from <strong>Aganyu</strong>, Malawi's talent discovery and job matching platform connecting organisations with qualified professionals and graduates.</p>
                <p>We recently featured open recruitment opportunities from <strong>${employer.company_name}</strong> to help extend their visibility among qualified Malawian job seekers.</p>
                
                ${activeJobCount > 0 ? `
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
                    <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: bold; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">Live Vacancies on Platform:</p>
                    <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #334155;">
                        ${sampleJobTitles}
                    </ul>
                    ${applicationCount > 0 ? `
                    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed #cbd5e1;">
                        <span style="display: inline-block; background-color: #ecfdf5; color: #047857; font-weight: bold; font-size: 12px; padding: 4px 8px; border-radius: 4px;">
                            ${applicationCount} candidate application${applicationCount === 1 ? '' : 's'} waiting
                        </span>
                        <p style="font-size: 12px; color: #64748b; margin: 6px 0 0 0;">
                            Claim your profile to view applicant profiles and contact candidates directly.
                        </p>
                    </div>
                    ` : ''}
                </div>
                ` : ''}

                <p>Activate your official employer account to manage your listings, review applicants, and post future vacancies directly.</p>
                <div style="margin: 28px 0;">
                    <a href="${claimUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                        Create Password &amp; Claim Profile
                    </a>
                </div>
                <p style="font-size: 13px; color: #64748b;">
                    Employer registration is currently free. If you have any questions, simply reply to this email.
                </p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                <p style="font-size: 12px; color: #94a3b8;">
                    Aganyu Platform · Connecting Malawi's Workforce · <a href="${appUrl}" style="color: #64748b;">aganyu.com</a>
                </p>
            </div>
        `;

        const emailSubject = `Action Required: Claim your official employer profile for ${employer.company_name}`;
        const { error: emailError } = await resend.emails.send({
            from: emailFrom,
            to: [emailToUse],
            subject: emailSubject,
            html: emailHtml,
        });

        if (emailError) {
            console.error("[Claim Invite] Resend error:", emailError);
            throw new Error(`Email delivery failed: ${emailError.message}`);
        }

        // 4.5. Log to Mail Box (campaign_broadcasts + broadcast_recipients) so it appears in Sent Messages
        try {
            const { data: bRecord } = await supabase
                .from("campaign_broadcasts")
                .insert({
                    created_by: auth.user.id,
                    audience: "EMPLOYERS",
                    channel: "EMAIL",
                    template_name: "EMPLOYER_CLAIM_INVITATION",
                    email_subject: emailSubject,
                    email_body: emailHtml,
                    status: "COMPLETED",
                    total_recipients: 1,
                    sent_email: 1,
                    failed_email: 0,
                })
                .select("id")
                .single();

            if (bRecord?.id) {
                await supabase.from("broadcast_recipients").insert({
                    broadcast_id: bRecord.id,
                    user_id: null,
                    email: emailToUse,
                    channel: "EMAIL",
                    status: "SENT",
                });
            }
        } catch (logErr) {
            console.warn("[Claim Invite] Failed to log email to Mail Box:", logErr);
        }

        // 5. Keep CRM status as LEAD until the employer actually registers, just bump engagement score
        await CRMService.updateScore(employer.id, 15);

        // 6. Mission Control Event
        await emitSystemEvent({
            category: "NOTIFICATION",
            severity: "SUCCESS",
            event: "EMPLOYER_CLAIM_INVITATION_SENT",
            message: `Claim invitation sent to ${emailToUse} for ${employer.company_name}`,
            actorId: auth.user.id,
            metadata: {
                employerId: employer.id,
                email: emailToUse,
            },
        });

        return NextResponse.json({
            success: true,
            message: `Invitation successfully sent to ${emailToUse}`,
            claimUrl,
        });
    } catch (err: any) {
        console.error("[Admin Send Claim Invitation] Error:", err);
        return NextResponse.json({ error: err.message || "Failed to send claim invitation" }, { status: 500 });
    }
}
