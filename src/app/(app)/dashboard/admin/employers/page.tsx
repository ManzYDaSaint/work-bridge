import EmployerVerificationClient from "./EmployerVerificationClient";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { userService } from "@/services/userService";
import { validateAuth } from "@/lib/auth-guard";
import { redirect } from "next/navigation";

export default async function EmployerVerificationPage({
    searchParams,
}: {
    searchParams: Promise<{ tab?: string; search?: string; status?: string }>;
}) {
    const auth = await validateAuth(["ADMIN"], false);
    if (auth.error || !auth.user) {
        redirect("/login");
    }

    const params = await searchParams;
    
    let employers: any[] = [];
    let closeRequests: any[] = [];
    try {
        const [employersResult, closeRequestsResult] = await Promise.all([
            (async () => {
                const supabase = await createSupabaseServerClient();
                const { data, error } = await supabase
                    .from("employers")
                    .select("*")
                    .order('company_name', { ascending: true });
                if (error) throw error;
                return (data || []).map(e => ({
                    id: e.id,
                    companyName: e.company_name,
                    industry: e.industry,
                    location: e.location,
                    status: e.status || 'PENDING',
                    website: e.website,
                    description: e.description,
                    createdAt: e.created_at
                }));
            })(),
            userService.getAccountClosureRequests({})
        ]);
        
        employers = employersResult;
        closeRequests = closeRequestsResult.items || [];
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
