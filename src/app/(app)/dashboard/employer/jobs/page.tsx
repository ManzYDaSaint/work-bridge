import { Briefcase, PlusCircle, Lock } from "lucide-react";
import { PageHeader, EmptyState, Tabs, Pagination } from "@/components/dashboard/ui";
import { requireDashboardProfile } from "@/lib/dashboard-auth";
import { jobService } from "@/services/jobService";
import JobListTable from "@/components/dashboard/employer/JobListTable";

export default async function EmployerJobsPage({
    searchParams,
}: {
    searchParams: Promise<{ status?: string; page?: string }>;
}) {
    const { profile: user } = await requireDashboardProfile("EMPLOYER");
    const params = await searchParams;
    
    const status = params.status || "all";
    const page = parseInt(params.page || "1");
    const limit = 20;
    const { jobs, totalPages } = await jobService.getEmployerJobs(
        user.id,
        status,
        page,
        limit
    );

    const isApproved = user.employer?.status === "APPROVED";
    const tabs = [
        { id: "all", label: "All" },
        { id: "ACTIVE", label: "Active" },
        { id: "EXPIRED", label: "Expired" },
        { id: "FILLED", label: "Filled" },
    ];

    return (
        <div className="space-y-6 pb-20">
            <PageHeader
                title="Manage roles"
                subtitle="A faster role list with clear status, quick edits, and fewer clicks."
                action={
                    isApproved
                        ? { label: "Post role", icon: PlusCircle, href: "/dashboard/employer/jobs/new" }
                        : { label: "Pending approval", icon: Lock, href: "/dashboard/employer", disabled: true }
                }
            />

            <Tabs
                tabs={tabs}
                activeTab={status}
                basePath="/dashboard/employer/jobs"
            />

            {jobs.length === 0 ? (
                <div className="rounded-2xl border border-stone-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/70">
                    <EmptyState
                        icon={Briefcase}
                        title={status === "all" ? "No roles yet" : `No ${status.toLowerCase()} roles`}
                        description="Keep this area focused on active hiring. Add a role when you're ready."
                        action={isApproved && status === "all" ? { label: "Post a role", href: "/dashboard/employer/jobs/new" } : undefined}
                        iconColor="text-[#16324f]"
                    />
                </div>
            ) : (
                <JobListTable 
                    initialJobs={jobs} 
                    employerStatus={user.employer?.status || "PENDING"} 
                />
            )}

            <Pagination 
                currentPage={page} 
                totalPages={totalPages} 
                basePath="/dashboard/employer/jobs"
                preserveParams={`status=${status}`}
            />
        </div>
    );
}
