"use client";

import { useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Badge, PageHeader } from "@/components/dashboard/ui";
import { toast } from "sonner";

type CRMProfile = {
    id: string;
    status: string;
    priority: "LOW" | "MEDIUM" | "HIGH" | string;
    engagement_score?: number | null;
    employer?: {
        company_name?: string | null;
        industry?: string | null;
        location?: string | null;
    } | null;
};

const STATUSES = ["LEAD", "REGISTERED", "VERIFICATION_PENDING", "VERIFIED", "ACTIVE", "INACTIVE", "CHURNED"];

function statusLabel(status: string) {
    return status.replaceAll("_", " ");
}

function priorityVariant(priority: string) {
    if (priority === "HIGH") return "red";
    if (priority === "LOW") return "slate";
    return "yellow";
}

export default function EmployerCRMClient({ initialProfiles }: { initialProfiles: CRMProfile[] }) {
    const [profiles, setProfiles] = useState(initialProfiles);
    const profilesByStatus = useMemo(
        () => STATUSES.map((status) => ({
            status,
            profiles: profiles.filter((profile) => profile.status === status),
        })),
        [profiles]
    );

    const onDragStart = (e: React.DragEvent, id: string) => {
        e.dataTransfer.setData("profileId", id);
    };

    const updateStatus = async (id: string, newStatus: string) => {
        const profile = profiles.find((item) => item.id === id);
        if (!profile || profile.status === newStatus) return;

        const previousProfiles = profiles;
        setProfiles((prev) => prev.map((item) => item.id === id ? { ...item, status: newStatus } : item));

        try {
            const res = await apiFetch("/api/admin/crm", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, status: newStatus }),
            });
            if (!res.ok) throw new Error("Update failed");
            toast.success("Employer status updated");
        } catch {
            toast.error("Failed to update status");
            setProfiles(previousProfiles);
        }
    };

    const onDrop = async (e: React.DragEvent, newStatus: string) => {
        const id = e.dataTransfer.getData("profileId");
        await updateStatus(id, newStatus);
    };

    return (
        <div className="space-y-6 pb-20">
            <PageHeader title="Employer CRM Pipeline" subtitle="Manage employer relationships and lifecycle status." />

            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
                {profilesByStatus.map(({ status, profiles: columnProfiles }) => (
                    <section
                        key={status}
                        className="flex min-h-56 flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => onDrop(e, status)}
                    >
                        <div className="flex items-center justify-between gap-2">
                            <h3 className="text-xs font-semibold uppercase text-slate-500">{statusLabel(status)}</h3>
                            <Badge label={String(columnProfiles.length)} />
                        </div>
                        <div className="flex flex-1 flex-col gap-2">
                            {columnProfiles.length === 0 ? (
                                <div className="flex min-h-24 items-center justify-center rounded border border-dashed border-slate-200 text-xs text-slate-400 dark:border-slate-700">
                                    No employers
                                </div>
                            ) : (
                                columnProfiles.map((profile) => (
                                    <article
                                        key={profile.id}
                                        draggable
                                        onDragStart={(e) => onDragStart(e, profile.id)}
                                        className="rounded border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800"
                                    >
                                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                                            {profile.employer?.company_name || "Unknown employer"}
                                        </p>
                                        <p className="mt-1 truncate text-xs text-slate-500">
                                            {[profile.employer?.industry, profile.employer?.location].filter(Boolean).join(" • ") || "No company details"}
                                        </p>
                                        <div className="mt-3 flex flex-wrap items-center gap-2">
                                            <Badge
                                                label={profile.priority || "MEDIUM"}
                                                variant={priorityVariant(profile.priority || "MEDIUM")}
                                            />
                                            <span className="text-xs text-slate-400">
                                                Score {profile.engagement_score ?? 0}
                                            </span>
                                        </div>
                                        <select
                                            className="mt-3 h-9 w-full rounded border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                                            value={profile.status}
                                            onChange={(e) => updateStatus(profile.id, e.target.value)}
                                        >
                                            {STATUSES.map((statusOption) => (
                                                <option key={statusOption} value={statusOption}>
                                                    {statusLabel(statusOption)}
                                                </option>
                                            ))}
                                        </select>
                                    </article>
                                ))
                            )}
                        </div>
                    </section>
                ))}
            </div>
        </div>
    );
}
