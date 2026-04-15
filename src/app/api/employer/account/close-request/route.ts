import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { withAudit } from "@/lib/api-utils";

export const POST = withAudit(async (request: Request) => {
    const auth = await validateAuth(["EMPLOYER"], false, true);
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();

    try {
        const { reasons, additionalNotes } = await request.json();

        if (!Array.isArray(reasons) || reasons.length === 0) {
            return NextResponse.json({ error: "Please select at least one reason." }, { status: 400 });
        }

        // Fetch company name for admin readability
        const { data: employer } = await supabase
            .from("employers")
            .select("company_name")
            .eq("id", auth.userId)
            .single();

        const { error } = await supabase
            .from("account_close_requests")
            .insert({
                user_id: auth.userId,
                company_name: employer?.company_name ?? null,
                reasons,
                additional_notes: additionalNotes?.trim() || null,
                status: "PENDING",
            });

        if (error) throw error;

        // Notify all admins via in-app notification
        const { data: admins } = await supabase
            .from("users")
            .select("id")
            .eq("role", "ADMIN");

        if (admins && admins.length > 0) {
            const notifications = admins.map((admin) => ({
                user_id: admin.id,
                message: `Account closure request from ${employer?.company_name ?? "an employer"}. Reasons: ${reasons.join(", ")}.`,
                type: "WARNING",
                is_read: false,
            }));
            await supabase.from("notifications").insert(notifications);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Close request error:", error);
        return NextResponse.json({ error: "Failed to submit request." }, { status: 500 });
    }
}, "EMPLOYER_CLOSE_REQUEST");
