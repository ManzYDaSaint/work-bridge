import { redirect } from "next/navigation";
import { validateAuth } from "@/lib/auth-guard";
import RecommendedJobsClient from "./RecommendedJobsClient";
import { RecommendationService, RecommendedJob } from "@/services/recommendation.service";

export default async function RecommendedJobsPage() {
    const auth = await validateAuth(["JOB_SEEKER"]);
    if (auth.error) redirect("/login");

    const user = auth.user;
    if (!user?.id) {
        return <div className="p-6 text-red-500">Failed to identify user.</div>;
    }

    let jobs: RecommendedJob[] = [];

    try {
        jobs = await RecommendationService.getRecommendedJobs(user.id, { limit: 12 });
    } catch (error: any) {
        const errorMessage = error?.message ?? "Failed to load recommendations.";
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Recommendations unavailable</h2>
                <p className="mt-2 text-slate-500 max-w-md">{errorMessage}</p>
            </div>
        );
    }

    return <RecommendedJobsClient jobs={jobs} />;
}

export const dynamic = "force-dynamic";
