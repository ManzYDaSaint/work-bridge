import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { checkAiServerHealth, performIntegrityScan } from "@/lib/ai-health";
import { validateAuth } from "@/lib/auth-guard";

export async function GET() {
    const auth = await validateAuth(["ADMIN"], false);
    if (auth.error) return auth.error;

    const supabase = getSupabaseAdminClient();
    if (!supabase) return new NextResponse("Admin client missing", { status: 500 });

    const health = await checkAiServerHealth();
    const scan = await performIntegrityScan();

    const { data: tasks } = await supabase
        .from('automation_tasks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    const pendingCount = tasks?.filter(t => t.status === 'PENDING').length || 0;

    // Fetch email analytics
    const { data: emailLogs } = await supabase
        .from('email_logs')
        .select('status')
        .limit(100);

    const emailMetrics = {
        sent: emailLogs?.filter(l => l.status === 'SENT').length || 0,
        failed: emailLogs?.filter(l => l.status === 'FAILED').length || 0,
    };

    return NextResponse.json({ 
        health, 
        scan, 
        automationTasks: { 
            tasks: tasks || [], 
            pendingCount 
        },
        emailMetrics
    });
}

export async function POST(request: Request) {
    const auth = await validateAuth(["ADMIN"], false);
    if (auth.error) return auth.error;

    const supabase = getSupabaseAdminClient();
    if (!supabase) return new NextResponse("Admin client missing", { status: 500 });

    const { action } = await request.json();
    
    // Logic to handle RESCAN, REBUILD_ALL, etc.
    return NextResponse.json({ success: true, action });
}


export const dynamic = "force-dynamic";
