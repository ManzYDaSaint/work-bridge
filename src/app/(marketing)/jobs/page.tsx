import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import PublicJobBoard from "@/components/jobs/PublicJobBoard";
import { UserProvider } from "@/context/UserContext";
import { buildMeProfile } from "@/lib/me-profile";
import { getAuthOptional } from "@/lib/auth-guard";

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
    const auth = await getAuthOptional();
    const user = auth.user;

    const { profile } = user
        ? await buildMeProfile(supabase, user.id)
        : { profile: null };

    if (profile?.role === "JOB_SEEKER") {
        redirect("/dashboard/seeker/jobs");
    }

    return (
        <Suspense fallback={<JobsFallback />}>
            <UserProvider initialUser={profile}>
                <div className="pb-20">
                    <section className="px-4 sm:px-6 max-w-6xl mx-auto pt-16 sm:pt-20 pb-10">
                        <div className="overflow-hidden rounded-[2rem] border border-stone-200/80 bg-white/90 px-6 py-8 shadow-[0_30px_90px_-50px_rgba(17,24,39,0.22)] backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/80 sm:px-10 sm:py-12">
                            <p className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-400">
                                Browse jobs
                            </p>
                            <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
                                Explore Malawi-first jobs with a calm, modern landing experience.
                            </h1>
                            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300 sm:text-lg">
                                Discover remote, hybrid, and on-site roles from trusted employers. This board is styled for the landing page while the in-platform job board stays unchanged.
                            </p>
                            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                                <a
                                    href="/register?role=seeker"
                                    className="inline-flex items-center justify-center rounded-2xl bg-[#16324f] px-6 py-3 text-base font-semibold text-white transition hover:opacity-90"
                                >
                                    Create a free profile
                                </a>
                                <a
                                    href="/login"
                                    className="inline-flex items-center justify-center rounded-2xl border border-stone-200 bg-white px-6 py-3 text-base font-semibold text-slate-900 transition hover:bg-stone-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
                                >
                                    Sign in to save jobs
                                </a>
                                <a
                                    href="#job-board"
                                    className="inline-flex items-center justify-center rounded-2xl px-6 py-3 text-base font-semibold text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                                >
                                    Jump to job listings
                                </a>
                            </div>
                        </div>
                    </section>

                    <section id="job-board" className="px-4 sm:px-6 max-w-6xl mx-auto">
                        <div className="rounded-[2rem] border border-stone-200 bg-stone-50 p-6 shadow-[0_24px_80px_-50px_rgba(17,24,39,0.18)] dark:border-slate-800 dark:bg-slate-900/80">
                            <PublicJobBoard />
                        </div>
                    </section>
                </div>
            </UserProvider>
        </Suspense>
    );
}
