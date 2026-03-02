import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET() {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Notifications GET error:", error);
        return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
    }

    // Format to camelCase
    const formattedData = data.map(notification => ({
        id: notification.id,
        userId: notification.user_id,
        jobId: notification.job_id,
        message: notification.message,
        isRead: notification.is_read,
        type: notification.type,
        createdAt: notification.created_at
    }));

    return NextResponse.json(formattedData);
}
