import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
    const auth = await validateAuth();
    if (auth.error) return auth.error;
    if (auth.role !== "EMPLOYER") {
        return NextResponse.json({ error: "Only employers can send invites" }, { status: 403 });
    }

    const supabase = await createSupabaseServerClient();

    try {
        const { seeker_id, job_id, message: customMessage } = await request.json();

        if (!seeker_id) {
            return NextResponse.json({ error: "seeker_id is required" }, { status: 400 });
        }

        // Fetch job details if provided
        let jobTitle = "a role";
        if (job_id) {
            const { data: job } = await supabase
                .from("jobs")
                .select("title")
                .eq("id", job_id)
                .eq("employer_id", auth.userId)
                .single();
            if (job) jobTitle = `"${job.title}"`;
        }

        // Fetch employer name
        const { data: employer } = await supabase
            .from("employers")
            .select("company_name")
            .eq("id", auth.userId)
            .single();
        const companyName = employer?.company_name || "An employer";

        const messageContent = customMessage || 
            `Hi! ${companyName} has reviewed your profile on WorkBridge and thinks you'd be a great fit for ${jobTitle}. We'd love to have you apply! If you're interested, feel free to view our open roles or reach out directly.`;

        // Upsert conversation (create if not exists)
        const { data: conversation, error: convError } = await supabase
            .from("conversations")
            .upsert(
                { seeker_id, employer_id: auth.userId },
                { onConflict: "seeker_id,employer_id", ignoreDuplicates: false }
            )
            .select()
            .single();

        if (convError) throw convError;

        // Insert the invite message
        const { error: msgError } = await supabase
            .from("messages")
            .insert({
                conversation_id: conversation.id,
                sender_id: auth.userId,
                content: messageContent
            })
            .select()
            .single();

        if (msgError) throw msgError;

        // Update conversation last message
        await supabase
            .from("conversations")
            .update({ last_message: messageContent, last_message_at: new Date().toISOString() })
            .eq("id", conversation.id);

        // Create a notification for the seeker
        const { data: seekerUser } = await supabase
            .from("job_seekers")
            .select("id")
            .eq("id", seeker_id)
            .single();

        if (seekerUser) {
            await supabase.from("notifications").insert({
                user_id: seeker_id,
                message: `${companyName} has invited you to apply for ${jobTitle}. Check your messages!`,
                link: "/dashboard/seeker/messages",
                type: "INVITE",
            });
        }

        return NextResponse.json({ success: true, conversation_id: conversation.id });
    } catch (error: any) {
        console.error("Invite error:", error);
        return NextResponse.json({ error: error.message || "Failed to send invite" }, { status: 500 });
    }
}
