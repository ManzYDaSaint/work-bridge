import AdminJobsClient from "./AdminJobsClient";
import { adminService } from "@/services/adminService";
import { validateAuth } from "@/lib/auth-guard";
import { redirect } from "next/navigation";

export default async function AdminJobsPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}) {
    const auth = await validateAuth(["ADMIN"], false);
    if (auth.error || !auth.user) {
        redirect("/login");
    }

    const params = await searchParams;
    const page = parseInt(params.page || "1");
    const search = params.search || "";
    const status = params.status || "ALL";
    const limit = 20;

    let jobs: any[] = [];
    let total = 0;

    try {
        const result = await adminService.getSystemJobs({ page, limit, search, status });
        jobs = result.jobs.map(j => {
            const employer = Array.isArray(j.employer) ? j.employer[0] : j.employer;
            return {
                ...j,
                createdAt: j.created_at,
                companyName: j.display_company_name || employer?.company_name,
                employer: {
                    id: employer?.id,
                    companyName: employer?.company_name,
                    location: employer?.location,
                    logoUrl: employer?.logo_url,
                    industry: employer?.industry,
                    website: employer?.website,
                    description: employer?.description,
                    recruiterVerified: employer?.recruiter_verified,
                },
                employerStatus: employer?.status,
            };
        });
        total = result.total;
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
            initialJobs={jobs} 
            initialTotal={total} 
            initialSearchParams={{
                page: params.page || "1",
                search: params.search || "",
                status: params.status || "ALL",
            }}
        />
    );
}
