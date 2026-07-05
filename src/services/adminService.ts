import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { cache } from "react";

async function safeQuery<T>(
    operation: () => T | Promise<T>,
    fallback: T,
    label: string
): Promise<T> {
    try {
        return await Promise.resolve(operation());
    } catch (error) {
        console.warn(`[adminService] ${label} failed, using fallback values`, error);
        return fallback;
    }
}

export interface AdminStats {
    totalUsers: number;
    totalSeekers: number;
    totalEmployers: number;
    totalJobs: number;
    totalApplications: number;
    pendingCloseRequests: number;
    badgeHolders: number;
    pendingJobs: number;
    funnel30d: {
        seekers: { stage: string; users: number }[];
        employers: { stage: string; users: number }[];
    };
    signupTrend: { date: string; signups: number }[];
}

/**
 * Admin Service handles marketplace-wide oversight and system-level operations.
 */
export const adminService = {
    /**
     * Calculate global marketplace statistics.
     * Complex calculation involving multiple table counts and event analysis.
     */
    getMarketplaceStats: cache(async (): Promise<AdminStats> => {
        const supabase = await createSupabaseServerClient();
        const adminClient = getSupabaseAdminClient();

        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

        const results = await Promise.all([
            safeQuery(
                () => supabase.from("users").select("*", { count: "exact", head: true }),
                { count: 0, error: null } as any,
                "users count"
            ),
            safeQuery(
                () => supabase.from("job_seekers").select("*", { count: "exact", head: true }),
                { count: 0, error: null } as any,
                "job_seekers count"
            ),
            safeQuery(
                () => supabase.from("employers").select("*", { count: "exact", head: true }),
                { count: 0, error: null } as any,
                "employers count"
            ),
            safeQuery(
                () => supabase.from("jobs").select("*", { count: "exact", head: true }),
                { count: 0, error: null } as any,
                "jobs count"
            ),
            safeQuery(
                () => supabase.from("applications").select("*", { count: "exact", head: true }),
                { count: 0, error: null } as any,
                "applications count"
            ),
            safeQuery(
                () => adminClient
                    ? adminClient
                        .from("product_events")
                        .select("role, stage, user_id, session_id")
                        .gte("created_at", thirtyDaysAgo)
                    : Promise.resolve({ data: [], error: null }),
                { data: [], error: null } as any,
                "product_events analytics"
            ),
            safeQuery(
                () => supabase.from("account_close_requests").select("*", { count: "exact", head: true }).eq("status", "PENDING"),
                { count: 0, error: null } as any,
                "account_close_requests count"
            ),
            safeQuery(
                () => supabase.from("job_seekers").select("*", { count: "exact", head: true }).eq("has_badge", true),
                { count: 0, error: null } as any,
                "badge holders count"
            ),
            safeQuery(
                () => supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "PENDING"),
                { count: 0, error: null } as any,
                "pending jobs count"
            ),
            safeQuery(
                () => supabase
                    .from("users")
                    .select("created_at")
                    .gte("created_at", thirtyDaysAgo)
                    .order("created_at", { ascending: true }),
                { data: [], error: null } as any,
                "signup trend"
            ),
        ]);

        const [
            usersRes, seekersRes, employersRes, jobsRes, appsRes,
            eventsRes,
            closeRequestsRes, pendingJobsRes, badgeHoldersRes,
            signupTrendRes,
        ] = results;

        const stats = [usersRes, seekersRes, employersRes, jobsRes, appsRes].map(r => (r as any).count || 0);
        const events = (eventsRes as any).data || [];

        // Funnel logic
        const funnelMap = new Map<string, Set<string>>();
        const stages = ["visit", "register", "onboarding", "apply", "hire"];
        const identityRoles = new Map<string, string>();

        events.forEach((event: any) => {
            const identity = event.user_id || event.session_id;
            if (identity && event.role && event.role !== "UNKNOWN") {
                identityRoles.set(identity, event.role);
            }
        });

        events.forEach((event: any) => {
            if (!event.stage) return;
            const identity = event.user_id || event.session_id;
            if (!identity) return;

            const role = identityRoles.get(identity) || event.role || "UNKNOWN";
            const key = `${role}:${event.stage}`;
            if (!funnelMap.has(key)) funnelMap.set(key, new Set());
            funnelMap.get(key)!.add(identity);

            const globalKey = `ALL:${event.stage}`;
            if (!funnelMap.has(globalKey)) funnelMap.set(globalKey, new Set());
            funnelMap.get(globalKey)!.add(identity);
        });

        // Signup trend
        const signupRows: { created_at: string }[] = (signupTrendRes as any).data || [];
        const trendMap = new Map<string, number>();
        signupRows.forEach(row => {
            const day = row.created_at.slice(0, 10);
            trendMap.set(day, (trendMap.get(day) || 0) + 1);
        });

        const signupTrend: { date: string; signups: number }[] = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
            const day = d.toISOString().slice(0, 10);
            signupTrend.push({ date: day, signups: trendMap.get(day) || 0 });
        }

        return {
            totalUsers: stats[0],
            totalSeekers: stats[1],
            totalEmployers: stats[2],
            totalJobs: stats[3],
            totalApplications: stats[4],
            pendingCloseRequests: (closeRequestsRes as any).count || 0,
            badgeHolders: (badgeHoldersRes as any).count || 0,
            pendingJobs: (pendingJobsRes as any).count || 0,
            funnel30d: {
                seekers: stages.map((stage) => ({
                    stage,
                    users: stage === "visit"
                        ? (funnelMap.get(`ALL:visit`)?.size || 0)
                        : (funnelMap.get(`JOB_SEEKER:${stage}`)?.size || 0),
                })),
                employers: stages.map((stage) => ({
                    stage,
                    users: stage === "visit"
                        ? (funnelMap.get(`ALL:visit`)?.size || 0)
                        : (funnelMap.get(`EMPLOYER:${stage}`)?.size || 0),
                })),
            },
            signupTrend,
        };
    }),

    /**
     * Fetch audit logs with filtering and pagination.
     */
    getAuditLogs: cache(async (params: { 
        offset?: number; 
        limit?: number; 
        userId?: string; 
        action?: string; 
        path?: string; 
    }) => {
        const supabase = await createSupabaseServerClient();
        const limit = params.limit || 50;
        const offset = params.offset || 0;

        let query = supabase
            .from("audit_logs")
            .select("*, user:users(id, email, role)")
            .order("created_at", { ascending: false });

        if (params.userId) query = query.eq("user_id", params.userId);
        if (params.action) query = query.eq("action", params.action);
        if (params.path) query = query.eq("path", params.path);

        const { data, error, count } = await query.range(offset, offset + limit - 1);

        if (error) {
            console.error("adminService.getAuditLogs error:", error);
            throw new Error("Failed to fetch audit logs");
        }

        return {
            items: data || [],
            total: count || 0
        };
    }),

    /**
     * Fetch system users for administrative management.
     */
    getSystemUsers: cache(async (params: { 
        page?: number; 
        limit?: number; 
        search?: string; 
        role?: string; 
    }) => {
        const supabase = await createSupabaseServerClient();
        const page = params.page || 1;
        const limit = params.limit || 50;
        const offset = (page - 1) * limit;

        let query = supabase
            .from("users")
            .select("*, job_seekers(full_name, location), employers(company_name, location)")
            .order("created_at", { ascending: false });

        if (params.search) {
            query = query.or(`email.ilike.%${params.search}%,job_seekers.full_name.ilike.%${params.search}%,employers.company_name.ilike.%${params.search}%`);
        }
        if (params.role && params.role !== "ALL") {
            query = query.eq("role", params.role);
        }

        const { data, error, count } = await query.range(offset, offset + limit - 1);

        if (error) {
            console.error("adminService.getSystemUsers error:", error);
            throw new Error("Failed to fetch system users");
        }

        return {
            users: data || [],
            total: count || 0
        };
    }),

    /**
     * Fetch system jobs for moderation.
     */
    getSystemJobs: cache(async (params: { 
        page?: number; 
        limit?: number; 
        search?: string; 
        status?: string; 
    }) => {
        const supabase = await createSupabaseServerClient();
        const page = params.page || 1;
        const limit = params.limit || 20;
        const offset = (page - 1) * limit;

        let query = supabase
            .from("jobs")
            .select("*, employer:employers(company_name)")
            .order("created_at", { ascending: false });

        if (params.search) {
            query = query.or(`title.ilike.%${params.search}%,employer.company_name.ilike.%${params.search}%`);
        }
        if (params.status && params.status !== "ALL") {
            query = query.eq("status", params.status);
        }

        const { data, error, count } = await query.range(offset, offset + limit - 1);

        if (error) {
            console.error("adminService.getSystemJobs error:", error);
            throw new Error("Failed to fetch system jobs");
        }

        return {
            jobs: data || [],
            total: count || 0
        };
    })
};
