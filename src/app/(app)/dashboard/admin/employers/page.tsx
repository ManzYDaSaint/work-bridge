import { serverApiFetchJson } from "@/lib/server-api";
import EmployerVerificationClient from "./EmployerVerificationClient";

interface EmployerPageResponse {
    items?: unknown[];
    data?: unknown[];
}

export default async function EmployerVerificationPage({
    searchParams,
}: {
    searchParams: Promise<{ tab?: string; search?: string; status?: string }>;
}) {
    const params = await searchParams;
    
    let employers: unknown[] = [];
    let closeRequests: unknown[] = [];
    try {
        [employers, closeRequests] = await Promise.all([
            serverApiFetchJson<EmployerPageResponse>("/api/admin/employers").then((data) => Array.isArray(data.items) ? data.items : Array.isArray(data.data) ? data.data : []),
            serverApiFetchJson<EmployerPageResponse>("/api/admin/close-requests").then((data) => Array.isArray(data.items) ? data.items : Array.isArray(data.data) ? data.data : [])
        ]);
    } catch (error) {
        console.error("Failed to fetch initial employers data:", error);
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <p className="text-slate-500">Failed to load employer verification data. Please refresh the page.</p>
            </div>
        );
    }
    
    return (
        <EmployerVerificationClient 
            initialEmployers={employers} 
            initialCloseRequests={closeRequests} 
            initialSearchParams={{
                tab: params.tab || "employers",
                search: params.search || "",
                status: params.status || "PENDING",
            }}
        />
    );
}
