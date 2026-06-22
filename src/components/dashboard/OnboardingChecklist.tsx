"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Circle } from "lucide-react";
import { SectionCard, Badge } from "@/components/dashboard/ui";
import type { User } from "@/types";

type ChecklistItem = {
    label: string;
    href: string;
    complete: boolean;
};

function hasText(value?: string | null) {
    return Boolean(value && value.trim().length > 0);
}

function buildSeekerItems(user: User): ChecklistItem[] {
    const seeker = user.jobSeeker;

    return [
        {
            label: "Add profile photo",
            href: "/dashboard/seeker/profile",
            complete: hasText(seeker?.avatarUrl) || hasText(seeker?.avatar_url),
        },
        {
            label: "Upload resume",
            href: "/dashboard/seeker/profile",
            complete: hasText(seeker?.resumeUrl) || hasText(seeker?.resume_url),
        },
        {
            label: "Add 3+ skills",
            href: "/dashboard/seeker/profile",
            complete: (seeker?.skills?.length ?? 0) >= 3,
        },
        {
            label: "Add your location",
            href: "/dashboard/seeker/profile",
            complete: hasText(seeker?.location),
        },
        {
            label: "Add work experience",
            href: "/dashboard/seeker/profile",
            complete: (seeker?.experience?.length ?? 0) > 0,
        },
        {
            label: "Add education",
            href: "/dashboard/seeker/profile",
            complete: (seeker?.education?.length ?? 0) > 0,
        },
    ];
}

function buildEmployerItems(user: User): ChecklistItem[] {
    const employer = user.employer;

    return [
        {
            label: "Add company logo",
            href: "/dashboard/employer/settings",
            complete: hasText(employer?.logoUrl) || hasText(employer?.logo_url),
        },
        {
            label: "Add company name",
            href: "/dashboard/employer/settings",
            complete: hasText(employer?.companyName) || hasText(employer?.company_name),
        },
        {
            label: "Add industry",
            href: "/dashboard/employer/settings",
            complete: hasText(employer?.industry),
        },
        {
            label: "Add company location",
            href: "/dashboard/employer/settings",
            complete: hasText(employer?.location),
        },
        {
            label: "Add company website",
            href: "/dashboard/employer/settings",
            complete: hasText(employer?.website),
        },
        {
            label: "Add company description",
            href: "/dashboard/employer/settings",
            complete: hasText(employer?.description),
        },
    ];
}

export default function OnboardingChecklist({ user }: { user: User | null }) {
    if (!user) return null;

    const items = user.role === "EMPLOYER" ? buildEmployerItems(user) : buildSeekerItems(user);
    const completed = items.filter((item) => item.complete).length;
    const total = items.length;
    const progress = Math.round((completed / total) * 100);

    if (progress === 100) return null;

    return (
        <SectionCard
            title="Onboarding checklist"
            action={{
                label: user.role === "EMPLOYER" ? "Open settings" : "Open profile",
                href: user.role === "EMPLOYER" ? "/dashboard/employer/settings" : "/dashboard/seeker/profile",
            }}
        >
            <div className="space-y-4 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="h-2 min-w-48 flex-1 overflow-hidden rounded-full bg-stone-100 dark:bg-slate-800">
                        <div className="h-full rounded-full bg-[#16324f] transition-all dark:bg-slate-200" style={{ width: `${progress}%` }} />
                    </div>
                    <Badge label={`${progress}% complete`} variant={progress >= 70 ? "green" : "yellow"} />
                </div>

                <div className="divide-y divide-stone-200/70 rounded-xl border border-stone-200 bg-stone-50 dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
                    {items.map((item) => {
                        const Icon = item.complete ? CheckCircle2 : Circle;

                        return (
                            <Link
                                key={item.label}
                                href={item.href}
                                className="flex min-h-12 items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-white dark:hover:bg-slate-800"
                            >
                                <span className="flex min-w-0 items-center gap-3">
                                    <Icon size={18} className={item.complete ? "shrink-0 text-emerald-600" : "shrink-0 text-slate-400"} />
                                    <span className={item.complete ? "truncate text-slate-500 line-through dark:text-slate-400" : "truncate font-medium text-slate-800 dark:text-slate-100"}>
                                        {item.label}
                                    </span>
                                </span>
                                <ArrowRight size={16} className="shrink-0 text-slate-400" />
                            </Link>
                        );
                    })}
                </div>
            </div>
        </SectionCard>
    );
}
