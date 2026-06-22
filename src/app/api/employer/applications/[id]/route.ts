import { createSupabaseServerClient } from "@/lib/supabase-server";
import { withAuth } from "@/lib/auth-guard";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { sendApplicationStatusEmail } from "@/lib/resend";
import { createNotification } from "@/lib/notifications";

export const PATCH = withAuth(async (request, auth, { params }) => {
    const supabase = await createSupabaseServerClient();
    const userId = auth.userId;
    const { id: applicationId } = await params;

    try {
        const { status, interviewLink } = await request.json();

        const ALLOWED_APPLICATION_STATUSES = new Set([
            "PENDING",
            "ACCEPTED",
            "REJECTED",
            "SHORTLISTED",
            "INTERVIEWING",
            "INVITED",
            "HIRED"
        ]);

        if (!ALLOWED_APPLICATION_STATUSES.has(status)) {
            return NextResponse.json({ error: "Invalid application status" }, { status: 400 });
        }

        if (interviewLink !== undefined && interviewLink !== null && interviewLink !== "") {
            if (status !== "INTERVIEWING") {
                return NextResponse.json({ error: "Interview link may only be provided when status is INTERVIEWING" }, { status: 400 });
            }
            try {
                new URL(interviewLink);
            } catch {
                return NextResponse.json({ error: "Invalid interview link URL" }, { status: 400 });
            }
        }

        const { data: applicationInfo, error: appInfoError } = await supabase
            .from("applications")
            .select("id, status, job:jobs(employer_id)")
            .eq("id", applicationId)
            .single();

        if (appInfoError || !applicationInfo) {
            console.error("Application ownership lookup failed:", appInfoError);
            return NextResponse.json({ error: "Application not found" }, { status: 404 });
        }

        if ((applicationInfo.job as any)?.employer_id !== userId) {
            return NextResponse.json({ error: "Unauthorized to update this application" }, { status: 403 });
        }

        const oldStatus = applicationInfo.status;

        const updateData: any = { status };
        if (status === "INTERVIEWING" && interviewLink) {
            updateData.interview_link = interviewLink;
        }

        const { data: application, error: updateError } = await supabase
            .from("applications")
            .update(updateData)
            .eq("id", applicationId)
            .select(`
                *,
                job:jobs(title, employer:employers(company_name)),
                user:users!applications_user_id_fkey(
                    email,
                    jobSeeker:job_seekers(full_name)
                )
            `)
            .single();

        if (updateError || !application) {
            console.error("Application update error:", updateError);
            return NextResponse.json({ error: "Failed to update application status" }, { status: 500 });
        }

        // --- Reward System: Grant +5 contact limits for reporting a HIRE ---
        if (status === "ACCEPTED" && oldStatus !== "ACCEPTED") {
            await supabase.rpc("increment_employer_contact_limit_bonus", {
                employer_id: userId,
                increment_val: 5
            });
 
            // Notify employer
            await createNotification({
                userId: userId,
                title: "Hire Reported - Bonus Earned!",
                message: "Thanks for reporting your hire! You've been rewarded with +5 free candidate contact views.",
                type: "SYSTEM",
            });
        }
        // If they undo the hire, we deduct the bonus atomically
        if (oldStatus === "ACCEPTED" && status !== "ACCEPTED") {
            await supabase.rpc("increment_employer_contact_limit_bonus", {
                employer_id: userId,
                increment_val: -5
            });
        }

        const seekerEmail = application.user?.email;
        const seekerName = (application.user as any)?.jobSeeker?.full_name || "Candidate";
        const jobTitle = application.job?.title;
        const companyName = (application.job as any)?.employer?.company_name || "Aganyu Employer";

        if (!seekerEmail) {
            console.warn(`[NOTIFICATION_DEBUG] SKIPPED: Seeker ${application.user_id} has no email or user record.`);
        }

        if (seekerEmail && ["ACCEPTED", "REJECTED", "SHORTLISTED", "INTERVIEWING"].includes(status)) {
            console.log(`[NOTIFICATION_DEBUG] INITIATING: Creating notification for seeker ${application.user_id} (${seekerEmail}) for status ${status}`);
            try {
                const [emailResult, notifResult] = await Promise.all([
                    sendApplicationStatusEmail(seekerEmail, {
                        seekerName,
                        jobTitle,
                        companyName,
                        status: status as any,
                        interviewLink: status === "INTERVIEWING" ? interviewLink : undefined,
                    }),
                    createNotification({
                        userId: application.user_id,
                        title: `Application ${status.toLowerCase()}`,
                        message: `${companyName} has updated your application for ${jobTitle} to ${status.toLowerCase()}.`,
                        type: "APPLICATION_UPDATE",
                        link: `/dashboard/seeker/applications`,
                    }),
                ]);
                
                if (!emailResult.success) {
                    console.error(`[NOTIFICATION_DEBUG] Email failed but notification may have succeeded:`, emailResult.error);
                }
                if (!notifResult) {
                    console.error(`[NOTIFICATION_DEBUG] Notification failed`);
                }
            } catch (notifyError) {
                console.error("Non-blocking notification error in Employer Status API:", notifyError);
            }
        }

        revalidatePath("/", "layout");
        revalidatePath("/dashboard/employer/candidates");
        revalidatePath("/dashboard/seeker/applications");

        return NextResponse.json({ success: true, item: application });
    } catch (error) {
        console.error("PATCH application error:", error);
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
}, ["EMPLOYER"], false, true);
