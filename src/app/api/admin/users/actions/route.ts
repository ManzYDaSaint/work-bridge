import { validateAuth } from "@/lib/auth-guard";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { constructSeekerDNA, generateEmbedding } from "@/lib/embedding-service";
import { recordAuditLog } from "@/lib/audit";
import { emitSystemEvent } from "@/lib/mission-control";
import { sendWhatsAppTemplate } from "@/lib/notification/worker";
import { sendStandardJobMatchEmail } from "@/lib/notification/email-matching";
import { RecommendationService } from "@/services/recommendation.service";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const auth = await validateAuth(['ADMIN'], false);
    if (auth.error) return auth.error;

    try {
        const body = await request.json();
        const { action, userId, seekerId } = body;

        if (!action || !userId) {
            return NextResponse.json({ error: "Action and userId required" }, { status: 400 });
        }

        const supabase = getSupabaseAdminClient();
        if (!supabase) {
            return NextResponse.json({ error: "Database client unavailable" }, { status: 500 });
        }

        // Action 1: Refresh & Recalculate AI Embeddings for Job Seeker
        if (action === "RECALCULATE_EMBEDDING") {
            const effectiveSeekerId = seekerId || userId;
            const { data: seeker, error: seekerError } = await supabase
                .from("job_seekers")
                .select("*")
                .eq("id", effectiveSeekerId)
                .single();

            if (seekerError || !seeker) {
                return NextResponse.json({ error: "Job seeker profile not found" }, { status: 404 });
            }

            const dna = constructSeekerDNA(seeker);
            let embedding: number[] | null = null;
            try {
                embedding = await generateEmbedding(dna);
            } catch (err: any) {
                console.warn("[Admin Action] Remote embedding server unreachable fallback:", err?.message);
            }

            const updatePayload: any = { dna_hash: dna };
            if (embedding) updatePayload.embedding = embedding;

            await supabase
                .from("job_seekers")
                .update(updatePayload)
                .eq("id", effectiveSeekerId);

            await recordAuditLog({
                action: "users_RECALCULATE_EMBEDDING",
                path: "/api/admin/users/actions",
                method: "POST",
                statusCode: 200,
                userId: auth.user.id,
                metadata: { targetUserId: userId, seekerId: effectiveSeekerId, embeddingUpdated: !!embedding }
            });

            await emitSystemEvent({
                category: "USER",
                severity: "SUCCESS",
                event: "ADMIN_USER_EMBEDDING_REFRESHED",
                message: `Admin refreshed AI embedding for user ${userId}`,
                actorId: auth.user.id,
                metadata: { targetUserId: userId }
            });

            return NextResponse.json({
                success: true,
                message: embedding ? "AI profile embedding recalculation complete!" : "DNA hash updated (embedding engine offline)",
                embeddingUpdated: !!embedding
            });
        }

        // Action 2: Simulate Live Opportunity Match Search
        if (action === "SIMULATE_MATCHES") {
            const effectiveSeekerId = seekerId || userId;

            // Fetch top published opportunities
            const { data: opps } = await supabase
                .from("opportunities")
                .select("id, title, category, organization_name, country, location_type, status")
                .in("status", ["PUBLISHED", "FEATURED", "CLOSING_SOON"])
                .order("created_at", { ascending: false })
                .limit(10);

            // Fetch existing recorded matches
            const { data: matches } = await supabase
                .from("opportunity_matches")
                .select("id, match_score, match_reason, opportunity_id, created_at")
                .eq("job_seeker_id", effectiveSeekerId)
                .order("match_score", { ascending: false });

            return NextResponse.json({
                success: true,
                simulatedMatches: matches || [],
                availableOpportunities: opps || []
            });
        }

        // Action 3: Send Match Notifications (WhatsApp for Premium, Email for Non-Premium)
        if (action === "SEND_MATCH_NOTIFICATIONS") {
            const effectiveSeekerId = seekerId;
            if (!effectiveSeekerId) {
                return NextResponse.json({ error: "seekerId is required for SEND_MATCH_NOTIFICATIONS" }, { status: 400 });
            }

            // Fetch seeker full profile + user email
            const { data: seeker } = await supabase
                .from("job_seekers")
                .select("id, full_name, phone, qualification, education, skills, experience, location, users!inner(email)")
                .eq("id", effectiveSeekerId)
                .single();

            if (!seeker) {
                return NextResponse.json({ error: "Seeker profile not found" }, { status: 404 });
            }

            const seekerEmail = (seeker as any).users?.email || null;

            // Check Premium status
            const nowIso = new Date().toISOString();
            const { data: activeSub } = await supabase
                .from("premium_subscriptions")
                .select("id")
                .eq("seeker_id", effectiveSeekerId)
                .eq("status", "ACTIVE")
                .gt("ends_at", nowIso)
                .maybeSingle();

            const isPremium = !!activeSub;

            // Fetch active job recommendations using same engine as Seeker dashboard
            const recommendedJobs = await RecommendationService.getRecommendedJobs(effectiveSeekerId, { limit: 10 }).catch(() => []);

            if (!recommendedJobs || recommendedJobs.length === 0) {
                return NextResponse.json({
                    success: false,
                    message: "No active job matches found for this seeker. Nothing was sent.",
                    channel: isPremium ? "WHATSAPP" : "EMAIL",
                    isPremium
                });
            }

            const seekerFirstName = seeker.full_name?.trim().split(" ")[0] || "Seeker";
            let sentCount = 0;
            let failedCount = 0;
            const results: any[] = [];

            if (isPremium) {
                // ── PREMIUM: Send WhatsApp notification ──────────────────────
                if (!seeker.phone) {
                    return NextResponse.json({
                        success: false,
                        message: "This premium seeker has no WhatsApp phone number on file.",
                        channel: "WHATSAPP",
                        isPremium
                    });
                }

                // Send one WhatsApp per matched job (up to top 5 to avoid flooding)
                const topJobs = recommendedJobs.slice(0, 5);
                for (const job of topJobs) {
                    try {
                        const payload = {
                            seekerName: seekerFirstName,
                            jobTitle: job.title,
                            company: job.display_company_name || (job as any).employer?.company_name || "Direct Employer",
                            matchScore: job.hard_match_score ?? 0,
                            location: job.location || "Malawi",
                            jobId: job.id
                        };

                        await sendWhatsAppTemplate(seeker.phone, "aganyu_job_match_alert_v1", payload);

                        // Log delivery
                        try {
                            await supabase.from("whatsapp_delivery_logs").insert({
                                user_id: userId,
                                seeker_id: effectiveSeekerId,
                                template_name: "aganyu_job_match_alert_v1",
                                phone: seeker.phone,
                                status: "SUCCESS",
                                payload,
                                created_at: new Date().toISOString()
                            });
                        } catch { /* non-critical log */ }

                        results.push({ jobId: job.id, title: job.title, status: "SENT" });
                        sentCount++;
                    } catch (err: any) {
                        results.push({ jobId: job.id, title: job.title, status: "FAILED", error: err?.message });
                        failedCount++;
                    }
                }
            } else {
                // ── NON-PREMIUM: Send Email notification ─────────────────────
                if (!seekerEmail) {
                    return NextResponse.json({
                        success: false,
                        message: "No email address found for this seeker.",
                        channel: "EMAIL",
                        isPremium
                    });
                }

                // Send a single consolidated email with all matched jobs (up to 10)
                const topJobs = recommendedJobs.slice(0, 10);
                try {
                    // Use the first match as the primary for subject line
                    const primaryJob = topJobs[0];
                    const res = await sendStandardJobMatchEmail({
                        seekerEmail,
                        seekerName: seeker.full_name || "Job Seeker",
                        jobTitle: topJobs.length > 1 ? `${primaryJob.title} + ${topJobs.length - 1} more` : primaryJob.title,
                        companyName: primaryJob.display_company_name || (primaryJob as any).employer?.company_name || "Direct Employer",
                        location: primaryJob.location || "Malawi",
                        jobId: primaryJob.id,
                        matchScore: primaryJob.hard_match_score ?? 0,
                        matchReason: `${topJobs.length} active job match${topJobs.length > 1 ? "es" : ""} found`
                    });

                    if (res.success) {
                        // Log in notification_queue as SENT for audit
                        try {
                            await supabase.from("notification_queue").insert({
                                seeker_id: effectiveSeekerId,
                                job_id: primaryJob.id,
                                template_id: "admin_manual_email_match_alert",
                                payload: {
                                    channel: "EMAIL",
                                    email: seekerEmail,
                                    jobCount: topJobs.length,
                                    jobs: topJobs.map(j => ({ id: j.id, title: j.title, score: j.hard_match_score }))
                                },
                                status: "SENT",
                                attempts: 1,
                                sent_at: new Date().toISOString()
                            });
                        } catch { /* non-critical audit log */ }

                        sentCount = topJobs.length;
                        results.push({ email: seekerEmail, jobCount: topJobs.length, status: "SENT" });
                    } else {
                        failedCount = 1;
                        results.push({ email: seekerEmail, status: "FAILED", error: res.error });
                    }
                } catch (err: any) {
                    failedCount = 1;
                    results.push({ email: seekerEmail, status: "FAILED", error: err?.message });
                }
            }

            await emitSystemEvent({
                category: "NOTIFICATION",
                severity: sentCount > 0 ? "SUCCESS" : "WARNING",
                event: "ADMIN_MANUAL_MATCH_NOTIFICATION",
                message: `Admin sent manual match notifications to ${isPremium ? "Premium (WhatsApp)" : "Non-Premium (Email)"} seeker ${effectiveSeekerId}. Sent: ${sentCount}, Failed: ${failedCount}`,
                actorId: auth.user.id,
                metadata: { userId, seekerId: effectiveSeekerId, isPremium, sentCount, failedCount, results }
            });

            return NextResponse.json({
                success: sentCount > 0,
                message: sentCount > 0
                    ? `✅ ${isPremium ? "WhatsApp" : "Email"} notification${sentCount > 1 ? "s" : ""} sent for ${sentCount} job match${sentCount > 1 ? "es" : ""}!`
                    : `Failed to send ${isPremium ? "WhatsApp" : "Email"} notification.`,
                channel: isPremium ? "WHATSAPP" : "EMAIL",
                isPremium,
                sentCount,
                failedCount,
                results
            });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (error: any) {
        console.error("Admin user action error:", error);
        return NextResponse.json({ error: "Action failed", details: error?.message }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
