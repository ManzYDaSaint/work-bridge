import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET() {
    const auth = await validateAuth();
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();

    // Fetch conversations with basic joined data
    const { data: conversations, error } = await supabase
        .from("conversations")
        .select(`
            *,
            seeker:job_seekers(id, full_name),
            employer:employers(id, company_name)
        `)
        .or(`seeker_id.eq.${auth.userId},employer_id.eq.${auth.userId}`)
        .order("last_message_at", { ascending: false });

    if (error) {
        console.error("Conversations GET error:", error);
        return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 });
    }

    // Format to camelCase
    const formatted = await Promise.all(conversations.map(async (conv: any) => {
        // Get unread count for this conversation for the current user
        const { count } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("conversation_id", conv.id)
            .neq("sender_id", auth.userId)
            .eq("is_read", false);

        return {
            id: conv.id,
            seekerId: conv.seeker_id,
            employerId: conv.employer_id,
            lastMessage: conv.last_message,
            lastMessageAt: conv.last_message_at,
            createdAt: conv.created_at,
            seeker: conv.seeker ? { id: conv.seeker.id, fullName: conv.seeker.full_name } : undefined,
            employer: conv.employer ? { id: conv.employer.id, companyName: conv.employer.company_name } : undefined,
            unreadCount: count || 0
        };
    }));

    return NextResponse.json(formatted);
}

export async function POST(request: Request) {
    const auth = await validateAuth();
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();

    try {
        const { seekerId, employerId } = await request.json();

        if (!seekerId || !employerId) {
            return NextResponse.json({ error: "Missing required IDs" }, { status: 400 });
        }

        // Try to find existing conversation
        const { data: existing, error: findError } = await supabase
            .from("conversations")
            .select("*")
            .eq("seeker_id", seekerId)
            .eq("employer_id", employerId)
            .single();

        if (existing) {
            return NextResponse.json(existing);
        }

        // Create new
        const { data, error } = await supabase
            .from("conversations")
            .insert({
                seeker_id: seekerId,
                employer_id: employerId
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        console.error("Conversation POST error:", error);
        return NextResponse.json({ error: error.message || "Failed to start conversation" }, { status: 500 });
    }
}
