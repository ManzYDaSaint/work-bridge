import { createSupabaseServerClient } from "@/lib/supabase-server";
import { withAuth } from "@/lib/auth-guard";
import { NextResponse } from "next/server";

export const GET = withAuth(async (request, auth) => {
    const supabase = await createSupabaseServerClient();
    
    try {
        const { data: alerts, error } = await supabase
            .from("job_alerts")
            .select("*")
            .eq("user_id", auth.userId)
            .order("created_at", { ascending: false });

        if (error) throw error;
        
        return NextResponse.json(alerts);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}, ["JOB_SEEKER"]);

export const POST = withAuth(async (request, auth) => {
    const supabase = await createSupabaseServerClient();
    
    try {
        const body = await request.json();
        const { keywords, location, jobType, workMode, frequency = "WEEKLY" } = body;
        
        // Prevent pure empty alerts
        if (!keywords && !location && !jobType && !workMode) {
            return NextResponse.json({ error: "Alert must have at least one search criteria" }, { status: 400 });
        }
        
        // Ensure user hasn't exceeded a reasonable limit (e.g., 5 alerts max)
        const { count } = await supabase
            .from("job_alerts")
            .select("*", { count: "exact", head: true })
            .eq("user_id", auth.userId);
            
        if (count && count >= 5) {
            return NextResponse.json({ error: "You can only create up to 5 job alerts" }, { status: 400 });
        }

        const { data: newAlert, error } = await supabase
            .from("job_alerts")
            .insert({
                user_id: auth.userId,
                keywords: keywords || null,
                location: location || null,
                job_type: jobType || null,
                work_mode: workMode || null,
                frequency,
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') { // Unique violation
                return NextResponse.json({ error: "You already have an identical alert" }, { status: 400 });
            }
            throw error;
        }
        
        return NextResponse.json({ success: true, alert: newAlert });
    } catch {
        console.error("Job Alert POST error");
        return NextResponse.json({ error: "Failed to create alert" }, { status: 500 });
    }
}, ["JOB_SEEKER"]);

export const DELETE = withAuth(async (request, auth) => {
    const supabase = await createSupabaseServerClient();
    
    try {
        const { searchParams } = new URL(request.url);
        const alertId = searchParams.get("id");
        
        if (!alertId) {
            return NextResponse.json({ error: "Alert ID required" }, { status: 400 });
        }

        const { error } = await supabase
            .from("job_alerts")
            .delete()
            .eq("id", alertId)
            .eq("user_id", auth.userId);

        if (error) throw error;
        
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: "Failed to delete alert" }, { status: 500 });
    }
}, ["JOB_SEEKER"]);
