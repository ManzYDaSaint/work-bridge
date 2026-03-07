import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { sendApplicationStatusEmail } from "@/lib/resend";

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { status } = await request.json();
        const { id: applicationId } = await params;

        // 1. Update the application status
        const { data: application, error: updateError } = await supabase
            .from("applications")
            .update({ status })
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

        // 2. Trigger Email Notification
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

        return NextResponse.json({ success: true, item: application });

    } catch (error) {
        console.error("PATCH application error:", error);
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
}
