import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { recordAuditLog } from "@/lib/audit";
import { sendEmployerVerificationEmail } from "@/lib/resend";
import { createNotification } from "@/lib/notifications";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function GET() {
    const auth = await validateAuth(['ADMIN'], false);
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();

    try {
        const { data: employers, error } = await supabase
            .from("employers")
            .select("*")
            .order('company_name', { ascending: true });

        if (error) throw error;

        const formattedEmployers = employers.map(e => ({
            id: e.id,
            companyName: e.company_name,
            industry: e.industry,
            location: e.location,
            status: e.status || 'PENDING',
            website: e.website,
            description: e.description,
            createdAt: e.created_at
        }));

        return NextResponse.json(formattedEmployers);
    } catch (error) {
        console.error("Admin employers fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch employers" }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    const auth = await validateAuth(['ADMIN'], false);
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();

    try {
        const { employerId, status, notes } = await request.json();
        const { user } = auth;

        // 1. Update employer status
        const { data: updatedEmployer, error } = await supabase
            .from("employers")
            .update({ status })
            .eq("id", employerId)
            .select("company_name")
            .single();

        if (error) throw error;

        // 2. Fetch employer's registered email
        const { data: employerUser } = await supabase
            .from("users")
            .select("email")
            .eq("id", employerId)
            .single();

        // 3. Send email notification (APPROVED or REJECTED only — not for PENDING revokes)
        if (employerUser?.email && (status === 'APPROVED' || status === 'REJECTED')) {
            await sendEmployerVerificationEmail(employerUser.email, {
                companyName: updatedEmployer?.company_name || "Your Company",
                status,
                notes
            });

            // Trigger Real-time notification for the employer
            await createNotification({
                userId: employerId,
                title: status === 'APPROVED' ? "Employer Verified" : "Verification Declined",
                message: status === 'APPROVED'
                    ? `Congratulations! ${updatedEmployer?.company_name} has been approved. You can now post jobs.`
                    : `Your employer verification for ${updatedEmployer?.company_name} was not successful.`,
                type: "VERIFICATION_UPDATE",
                link: `/dashboard/employer`
            });
        }

        // 4. Record Audit Log
        await recordAuditLog({
            action: `EMPLOYER_VERIFICATION_${status}`,
            path: "/api/admin/employers",
            method: "PATCH",
            statusCode: 200,
            userId: user.id,
            metadata: { employerId, status, notes }
        });

        // Clean up caches for Admin, Employer, and Job board
        revalidatePath("/", "layout");
        revalidatePath("/dashboard/admin");
        revalidatePath("/dashboard/employer");
        revalidatePath("/jobs");

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Admin employer update error:", error);
        return NextResponse.json({ error: "Update failed", details: (error as any)?.message }, { status: 500 });
    }
}
