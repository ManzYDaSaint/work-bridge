import { MetadataRoute } from 'next';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://aganyu.co';
    
    // Core static routes
    const routes: MetadataRoute.Sitemap = [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 1,
        },
        {
            url: `${baseUrl}/terms`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.5,
        },
        {
            url: `${baseUrl}/privacy`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.5,
        },
        {
            url: `${baseUrl}/login`,
            lastModified: new Date(),
            changeFrequency: 'yearly',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/register`,
            lastModified: new Date(),
            changeFrequency: 'yearly',
            priority: 0.9,
        },
        {
            url: `${baseUrl}/jobs`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.9,
        }
    ];

    try {
        const supabase = getSupabaseAdminClient();
        if (supabase) {
            // Fetch all ACTIVE jobs
            const { data: jobs } = await supabase
                .from('jobs')
                .select('id, public_slug, updated_at, created_at')
                .eq('status', 'ACTIVE');

            if (jobs) {
                const jobRoutes = jobs.map((job) => ({
                    url: `${baseUrl}/jobs/${job.public_slug || job.id}`,
                    lastModified: job.updated_at ? new Date(job.updated_at) : new Date(job.created_at),
                    changeFrequency: 'daily' as const,
                    priority: 0.7,
                }));
                routes.push(...jobRoutes);
            }
        }
    } catch (e) {
        console.error("Failed to fetch jobs for sitemap", e);
    }

    return routes;
}
