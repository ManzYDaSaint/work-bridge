import { Suspense } from "react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

import PublicJobBoard from "@/components/jobs/PublicJobBoard";

function JobsFallback() {
    return (
        <div className="max-w-3xl mx-auto px-4 py-16 space-y-6 animate-pulse">
            <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg w-48" />
            <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl" />
            <div className="h-64 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800" />
        </div>
    );
}

export default function SeekerJobsPage() {
    return (
        <Suspense fallback={<JobsFallback />}>
            <PublicJobBoard />
        </Suspense>
    );
}
