import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import SeekerProfile from "@/components/profile/SeekerProfile";

export default async function SeekerProfilePage() {
    // 1. Server-side Auth Check
    const auth = await validateAuth(["JOB_SEEKER"]);
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();

    try {
        // 2. Parallel Data Fetching on the Server
        const [profileData, certsData] = await Promise.all([
            supabase
                .from("job_seekers")
                .select("*")
                .eq("user_id", auth.userId)
                .single(),
            supabase
                .from("certificates")
                .select("*")
                .eq("seeker_id", auth.userId)
                .order("created_at", { ascending: false }),
        ]);

        if (profileData.error) throw profileData.error;

        return (
            <SeekerProfile 
                initialProfile={profileData.data} 
                initialCertificates={certsData.data || []} 
            />
        );
    } catch (error) {
        console.error("Seeker Profile Server Error:", error);
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <p className="text-slate-500">Failed to load profile. Please try refreshing.</p>
            </div>
        );
    }
}
