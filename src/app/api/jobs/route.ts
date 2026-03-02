import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { getSemanticMatchScore } from "@/lib/ai";

export async function GET(request: Request) {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");

    let dbQuery = supabase
        .from("jobs")
        .select(`
            *,
            employer:employers(company_name, id)
        `)
        .order("created_at", { ascending: false });

    if (query) {
        dbQuery = dbQuery.ilike("title", `%${query}%`);
    }

    const { data, error } = await dbQuery;

    if (error) {
        console.error("Jobs GET error:", error);
        return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
    }

    return NextResponse.json(data);
}

export async function POST(request: Request) {
    const auth = await validateAuth(['EMPLOYER'], true);
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();

    try {
        const body = await request.json();

        const { data, error } = await supabase
            .from("jobs")
            .insert({
                employer_id: auth.userId,
                title: body.title,
                description: body.description,
                location: body.location,
                type: body.type,
                skills: body.skills || [],
            })
            .select()
            .single();

        if (error) throw error;

        // --- Strategic Notification Engine Trigger ---
        const job = data;
        const { data: allSeekers } = await supabase.from("job_seekers").select("*");

        if (allSeekers) {
            const notificationPromises = allSeekers.map(async (seeker) => {
                const result = await getSemanticMatchScore(
                    seeker.skills || [],
                    job.skills || [],
                    seeker.bio || "",
                    job.description || ""
                );

                const isHighMatch = result.score >= 75;
                const isSubscribed = seeker.is_subscribed;

                let message = `New Job: ${job.title} at ${job.location}`;
                let type = 'GENERAL';

                if (isSubscribed && isHighMatch) {
                    message = `🔥 Elite Match Found: ${job.title} matches your qualifications by ${result.score}%! Click to quick-apply.`;
                    type = 'SUCCESS';
                } else if (!isSubscribed) {
                    message = `New Job Alert: ${job.title} is now active. Check if you're a fit!`;
                }

                return {
                    user_id: seeker.id,
                    job_id: job.id,
                    message,
                    type,
                    is_read: false
                };
            });

            const notifications = await Promise.all(notificationPromises);

            // Batch insert notifications
            if (notifications.length > 0) {
                await supabase.from("notifications").insert(notifications);
            }
        }

        return NextResponse.json({ success: true, job: data });
    } catch (error: any) {
        console.error("Job POST error:", error);
        return NextResponse.json({ error: error.message || "Failed to post job" }, { status: 500 });
    }
}
