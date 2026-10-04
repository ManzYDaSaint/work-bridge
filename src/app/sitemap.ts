import { MetadataRoute } from 'next';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const rawUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://aganyu.com';
    const baseUrl = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
    
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
        },
        {
            url: `${baseUrl}/opportunities`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.9,
        }
    ];

    try {
        const supabase = getSupabaseAdminClient();
        if (supabase) {
            // 1. Fetch all ACTIVE jobs
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

            // 2. Fetch all PUBLISHED / FEATURED / CLOSING_SOON opportunities
            const { data: opportunities } = await supabase
                .from('opportunities')
                .select('id, slug, updated_at, created_at')
                .in('status', ['PUBLISHED', 'FEATURED', 'CLOSING_SOON']);

            if (opportunities) {
                const oppRoutes = opportunities.map((opp) => ({
                    url: `${baseUrl}/opportunities/${opp.slug || opp.id}`,
                    lastModified: opp.updated_at ? new Date(opp.updated_at) : new Date(opp.created_at),
                    changeFrequency: 'daily' as const,
                    priority: 0.7,
                }));
                routes.push(...oppRoutes);
            }

            // 3. Fetch all PUBLIC job seeker profiles with a public_slug
            const { data: profiles } = await supabase
                .from('job_seekers')
                .select('public_slug, updated_at, created_at')
                .eq('profile_visibility', 'PUBLIC')
                .not('public_slug', 'is', null);

            if (profiles) {
                const profileRoutes = profiles.map((profile) => ({
                    url: `${baseUrl}/in/${profile.public_slug}`,
                    lastModified: profile.updated_at ? new Date(profile.updated_at) : new Date(profile.created_at),
                    changeFrequency: 'weekly' as const,
                    priority: 0.6,
                }));
                routes.push(...profileRoutes);
            }
        }
    } catch (e) {
        console.error("Failed to fetch dynamic routes for sitemap", e);
    }

    return routes;
}
