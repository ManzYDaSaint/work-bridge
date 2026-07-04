import { serverApiFetchJson } from "@/lib/server-api";
import AdminJobsClient from "./AdminJobsClient";

interface AdminJobsResponse {
    jobs?: unknown[];
    total?: number;
}

export default async function AdminJobsPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}) {
    const params = await searchParams;
    const page = parseInt(params.page || "1");
    const search = params.search || "";
    const status = params.status || "ALL";
    const limit = 20;

    let data: AdminJobsResponse;
    try {
        data = await serverApiFetchJson<AdminJobsResponse>(`/api/admin/jobs?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}&status=${status}`);
    } catch (error) {
        console.error("Failed to fetch initial jobs:", error);
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <p className="text-slate-500">Failed to load jobs. Please refresh the page.</p>
            </div>
        );
    }
    
    return (
        <AdminJobsClient 
            initialJobs={data.jobs || []} 
            initialTotal={data.total || 0} 
            initialSearchParams={{
                page: params.page || "1",
                search: params.search || "",
                status: params.status || "ALL",
            }}
        />
    );
}
