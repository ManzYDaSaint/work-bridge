import { serverApiFetchJson } from "@/lib/server-api";
import UserManagementClient from "./UserManagementClient";

interface UserManagementResponse {
    users?: unknown[];
    total?: number;
}

export default async function UserManagementPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string; search?: string; role?: string }>;
}) {
    const params = await searchParams;
    const page = parseInt(params.page || "1");
    const search = params.search || "";
    const role = params.role || "ALL";
    const limit = 50;

    let data: UserManagementResponse;
    try {
        data = await serverApiFetchJson<UserManagementResponse>(`/api/admin/users?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}&role=${role}`);
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
            initialUsers={data.users || []} 
            initialTotal={data.total || 0} 
            initialSearchParams={{
                page: params.page || "1",
                search: params.search || "",
                role: params.role || "ALL",
            }}
        />
    );
}
