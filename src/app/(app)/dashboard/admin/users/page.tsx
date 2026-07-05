import UserManagementClient from "./UserManagementClient";
import { adminService } from "@/services/adminService";
import { validateAuth } from "@/lib/auth-guard";
import { redirect } from "next/navigation";

export default async function UserManagementPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string; search?: string; role?: string }>;
}) {
    const auth = await validateAuth(["ADMIN"], false);
    if (auth.error || !auth.user) {
        redirect("/login");
    }

    const params = await searchParams;
    const page = parseInt(params.page || "1");
    const search = params.search || "";
    const role = params.role || "ALL";
    const limit = 50;

    let users: any[] = [];
    let total = 0;

    try {
        const result = await adminService.getSystemUsers({ page, limit, search, role });
        users = result.users.map(u => {
            const seeker = Array.isArray(u.job_seekers) ? u.job_seekers[0] : u.job_seekers;
            const employer = Array.isArray(u.employers) ? u.employers[0] : u.employers;

            return {
                id: u.id,
                email: u.email,
                role: u.role,
                createdAt: u.created_at,
                name: u.role === 'JOB_SEEKER'
                    ? seeker?.full_name
                    : (u.role === 'EMPLOYER' ? employer?.company_name : 'Admin'),
                location: u.role === 'JOB_SEEKER'
                    ? seeker?.location
                    : employer?.location
            };
        });
        total = result.total;
    } catch (error) {
        console.error("Failed to fetch initial users:", error);
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <p className="text-slate-500">Failed to load users. Please refresh the page.</p>
            </div>
        );
    }
    
    return (
        <UserManagementClient 
            initialUsers={users} 
            initialTotal={total} 
            initialSearchParams={{
                page: params.page || "1",
                search: params.search || "",
                role: params.role || "ALL",
            }}
        />
    );
}
