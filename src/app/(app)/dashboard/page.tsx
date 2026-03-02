import { createSupabaseServerClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Direct database check for role (Server Component)
    const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile) {
        if (profile.role === "ADMIN") {
            redirect("/dashboard/admin");
        } else if (profile.role === "EMPLOYER") {
            redirect("/dashboard/employer");
        } else {
            redirect("/dashboard/seeker");
        }
    }

    // Fallback if profile doesn't exist yet
    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-[#020617]">
            <div className="animate-pulse flex flex-col items-center gap-6">
                <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin shadow-2xl shadow-blue-500/20" />
                <div className="flex flex-col items-center gap-2">
                    <p className="font-black text-slate-900 dark:text-white tracking-[0.2em] text-xs">Initializing Session</p>
                    <p className="text-[10px] font-bold text-slate-400 tracking-widest">Bridging your workspace...</p>
                </div>
            </div>
        </div>
    );
}
