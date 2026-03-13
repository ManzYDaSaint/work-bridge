import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const auth = await validateAuth();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
        return NextResponse.json({ error: "Missing conversationId" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    const { data: messages, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Messages GET error:", error);
        return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
    }

    // Format to camelCase
    const formatted = messages.map((m: any) => ({
        id: m.id,
        conversationId: m.conversation_id,
        senderId: m.sender_id,
        content: m.content,
        isRead: m.is_read,
        createdAt: m.created_at
    }));

    return NextResponse.json(formatted);
}

export async function POST(request: Request) {
    const auth = await validateAuth();
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();

    try {
        const { conversationId, content } = await request.json();

        if (!conversationId || !content) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Insert message
        const { data, error } = await supabase
            .from("messages")
            .insert({
                conversation_id: conversationId,
                sender_id: auth.userId,
                content: content
            })
            .select()
            .single();

        if (error) throw error;

        // Update conversation last message pointer
        await supabase
            .from("conversations")
            .update({
                last_message: content,
                last_message_at: new Date().toISOString()
            })
            .eq("id", conversationId);

        return NextResponse.json({
            id: data.id,
            conversationId: data.conversation_id,
            senderId: data.sender_id,
            content: data.content,
            isRead: data.is_read,
            createdAt: data.created_at
        });
    } catch (error: any) {
        console.error("Message POST error:", error);
        return NextResponse.json({ error: error.message || "Failed to send message" }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    const auth = await validateAuth();
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();

    try {
        const { conversationId } = await request.json();

        // Mark all messages in this conversation as read for the current user (if they are the recipient)
        const { error } = await supabase
            .from("messages")
            .update({ is_read: true })
            .eq("conversation_id", conversationId)
            .neq("sender_id", auth.userId);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
