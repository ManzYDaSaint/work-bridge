import { NextResponse } from "next/server";
import { triggerMatchNotifications } from "@/lib/match-notification-service";

// Supabase Webhooks send a POST request with the new record
export async function POST(request: Request) {
    try {
        const payload = await request.json();
        
        // Ensure this is an insert event for the jobs table
        if (payload.type === "INSERT" && payload.table === "jobs" && payload.record?.id) {
            const jobId = payload.record.id;
            
            console.log(`[WEBHOOK] Processing new job insertion: ${jobId}`);
            
            // Fire the match notification logic
            // Since this is a webhook, we CAN await it because Supabase handles the timeout/retry
            await triggerMatchNotifications(jobId);
            
            return NextResponse.json({ success: true, processed: true });
        }
        
        return NextResponse.json({ success: true, processed: false, message: "Ignored event" });

    } catch (error: any) {
        console.error("[WEBHOOK] Error processing job webhook:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
