import { ImageResponse } from 'next/og';
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const runtime = 'edge';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createSupabaseServerClient();

        // 1. Fetch job details
        const { data: job, error } = await supabase
            .from("jobs")
            .select(`
                title,
                location,
                type,
                work_mode,
                employer:employers(company_name)
            `)
            .eq("id", id)
            .single();

        if (error || !job) {
            return new Response("Job not found", { status: 404 });
        }

        const companyName = (job.employer as any)?.company_name || "WorkBridge Partner";

        // 2. Render dynamic OG image
        return new ImageResponse(
            (
                <div
                    style={{
                        height: '100%',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        justifyContent: 'center',
                        backgroundColor: '#0f172a',
                        backgroundImage: 'radial-gradient(circle at 25% 25%, #1e293b 0%, #0f172a 100%)',
                        padding: '80px',
                        fontFamily: 'sans-serif',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '40px' }}>
                        <div style={{
                            background: '#2563eb',
                            width: '40px',
                            height: '40px',
                            borderRadius: '8px',
                            marginRight: '16px'
                        }} />
                        <span style={{ color: '#fff', fontSize: '32px', fontWeight: 'bold', letterSpacing: '-0.05em' }}>WorkBridge</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ color: '#3b82f6', fontSize: '24px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '16px' }}>
                            Hiring Now
                        </span>
                        <div style={{ color: '#fff', fontSize: '72px', fontWeight: 'bold', lineHeight: 1.1, marginBottom: '24px', display: 'flex' }}>
                            {job.title}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <span style={{ color: '#94a3b8', fontSize: '32px' }}>{companyName}</span>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#334155' }} />
                            <span style={{ color: '#94a3b8', fontSize: '32px' }}>{job.location}</span>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#334155' }} />
                            <span style={{ color: '#94a3b8', fontSize: '32px' }}>{String(job.work_mode || 'REMOTE').replace(/_/g, ' ')}</span>
                        </div>
                    </div>

                    <div style={{
                        marginTop: 'auto',
                        display: 'flex',
                        padding: '16px 32px',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '100px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#34d399',
                        fontSize: '20px',
                        fontWeight: '600'
                    }}>
                        ✓ Structured Hiring Opportunity
                    </div>
                </div>
            ),
            {
                width: 1200,
                height: 630,
            }
        );
    } catch (e: any) {
        console.error(e);
        return new Response(`Failed to generate image`, { status: 500 });
    }
}
