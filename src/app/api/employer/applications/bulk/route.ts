import { createSupabaseServerClient } from "@/lib/supabase-server";
import { withAuth } from "@/lib/auth-guard";
import { NextResponse } from "next/server";
import { sendApplicationStatusEmail } from "@/lib/resend";

export const PATCH = withAuth(async (request, auth) => {
    const supabase = await createSupabaseServerClient();
    const userId = auth.userId;

    try {
        const { applicationIds, status, interviewLink } = await request.json();

        if (!Array.isArray(applicationIds) || applicationIds.length === 0 || !status) {
            return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
        }

        const { data: authorizedApplications, error: authCheckError } = await supabase
            .from("applications")
            .select("id, job:jobs(employer_id)")
            .in("id", applicationIds);

        if (authCheckError) {
            console.error("Bulk applications auth validation error:", authCheckError);
            return NextResponse.json({ error: "Failed to verify application ownership" }, { status: 500 });
        }

        if (!authorizedApplications || authorizedApplications.length !== applicationIds.length) {
            return NextResponse.json({ error: "One or more applications were not found" }, { status: 404 });
        }

        const unauthorizedUpdate = authorizedApplications.some(
            (application) => (application.job as any)?.employer_id !== userId
        );

        if (unauthorizedUpdate) {
            return NextResponse.json({ error: "Unauthorized to update one or more applications" }, { status: 403 });
        }

        const updateData: any = { status };
        if (status === "INTERVIEWING" && interviewLink) {
            updateData.interview_link = interviewLink;
        }

        const { data: applications, error: updateError } = await supabase
            .from("applications")
            .update(updateData)
            .in("id", applicationIds)
            .select(`
                *,
                job:jobs(title, employer:employers(company_name)),
                user:users!applications_user_id_fkey(
                    email,
                    jobSeeker:job_seekers(full_name)
                )
            `);

        if (updateError || !applications) {
            console.error("Applications bulk update error:", updateError);
            return NextResponse.json({ error: "Failed to update applications status" }, { status: 500 });
        }

        // Send emails for updated applications
        await Promise.allSettled(
            applications.map(async (application) => {
                const seekerEmail = application.user?.email;
                const seekerName = (application.user as any)?.jobSeeker?.full_name || "Candidate";
                const jobTitle = application.job?.title;
                const companyName = (application.job as any)?.employer?.company_name || "WorkBridge Employer";

                if (seekerEmail && ["ACCEPTED", "REJECTED", "SHORTLISTED", "INTERVIEWING"].includes(status)) {
                    const emailResult = await sendApplicationStatusEmail(seekerEmail, {
                        seekerName,
                        jobTitle,
                        companyName,
                        status: status as any,
                        interviewLink: status === "INTERVIEWING" ? application.interview_link : undefined,
                    });
                    
                    if (!emailResult.success) {
                        console.error(`[EMAIL_DEBUG] Bulk: Failed to send email to ${seekerEmail}:`, emailResult.error);
                    } else {
                        console.log(`[EMAIL_DEBUG] Bulk: Email sent to ${seekerEmail}`);
                    }
                }
            })
        ).catch((err) => {
            console.error("Bulk email error:", err);
        });

        return NextResponse.json({ success: true, count: applications.length, items: applications });
    } catch (error) {
        console.error("PATCH bulk applications error:", error);
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
}, ["EMPLOYER"], false, true);
