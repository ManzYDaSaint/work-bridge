import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { sendApplicationStatusEmail } from "@/lib/resend";

export async function PATCH(request: Request) {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { applicationIds, status } = await request.json();

        if (!Array.isArray(applicationIds) || applicationIds.length === 0 || !status) {
            return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
        }

        // 1. Update the application status in bulk
        const { data: applications, error: updateError } = await supabase
            .from("applications")
            .update({ status })
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

        // 2. Trigger Email Notification for each application in background
        Promise.allSettled(
            applications.map(async (application) => {
                const seekerEmail = application.user?.email;
                const seekerName = (application.user as any)?.jobSeeker?.full_name || "Candidate";
                const jobTitle = application.job?.title;
                const companyName = (application.job as any)?.employer?.company_name || "WorkBridge Employer";

                if (seekerEmail && (status === 'ACCEPTED' || status === 'REJECTED' || status === 'SHORTLISTED')) {
                    await sendApplicationStatusEmail(seekerEmail, {
                        seekerName,
                        jobTitle,
                        companyName,
                        status: status as any
                    });
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
}
