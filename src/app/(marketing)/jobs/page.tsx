import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import PublicJobBoard from "@/components/jobs/PublicJobBoard";

export const dynamic = "force-dynamic";

function JobsFallback() {
    return (
        <div className="max-w-3xl mx-auto px-4 py-16 space-y-6 animate-pulse">
            <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg w-48" />
            <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl" />
            <div className="h-64 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800" />
        </div>
    );
}

export default async function JobsPage() {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        const { data: userData } = await supabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .single();

        if (userData?.role === "JOB_SEEKER") {
            redirect("/dashboard/seeker/jobs");
        }
    }

    return (
        <Suspense fallback={<JobsFallback />}>
            <PublicJobBoard />
        </Suspense>
    );
}
