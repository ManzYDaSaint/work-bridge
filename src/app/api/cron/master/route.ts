import { NextResponse } from "next/server";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const authHeader = req.headers.get("authorization");
    if (
        process.env.CRON_SECRET &&
        authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_URL || "https://aganyu.com";
    const headers = {
        'authorization': authHeader || `Bearer ${process.env.CRON_SECRET}`
    };

    const endpoints = [
        'expire-jobs',
        'resync-embeddings',
        'process-delayed-matches',
        'process-automation',
        'queue-retention-reminders',
        'prune-notifications',
        'process-ingestion'
    ];

    const results: any[] = [];

    await Promise.allSettled(
        endpoints.map(async (endpoint) => {
            try {
                const res = await fetch(`${appUrl}/api/cron/${endpoint}`, { headers });
                results.push({ task: endpoint, status: res.status });
            } catch (e: any) {
                results.push({ task: endpoint, error: e.message });
            }
        })
    );

    return NextResponse.json({ success: true, results });
}
