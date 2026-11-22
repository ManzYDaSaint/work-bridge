"use client";

import { useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Badge, PageHeader } from "@/components/dashboard/ui";
import { Send, Mail, Building2, Check, Loader2, ExternalLink, MessageCircle, Copy } from "lucide-react";
import { toast } from "sonner";

type CRMProfile = {
    id: string;
    status: string;
    priority: "LOW" | "MEDIUM" | "HIGH" | string;
    engagement_score?: number | null;
    employer?: {
        id?: string;
        company_name?: string | null;
        industry?: string | null;
        location?: string | null;
        website?: string | null;
        recruitment_email?: string | null;
        account_type?: string | null;
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

    const [sendingInviteId, setSendingInviteId] = useState<string | null>(null);

    const sendClaimInvite = async (profile: CRMProfile) => {
        const empId = profile.employer?.id;
        if (!empId) {
            toast.error("Employer record missing ID");
            return;
        }

        const email = profile.employer?.recruitment_email || "";
        const promptEmail = email || window.prompt(`Enter recruitment or HR email for ${profile.employer?.company_name}:`);
        if (!promptEmail || !promptEmail.includes("@")) {
            if (promptEmail !== null) toast.error("A valid email is required to send an invitation.");
            return;
        }

        setSendingInviteId(profile.id);
        try {
            const res = await apiFetch("/api/admin/employers/claim-invite", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    employerId: empId,
                    recipientEmail: promptEmail.trim().toLowerCase(),
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to send claim invitation");

            toast.success(data.message || `Invitation sent to ${promptEmail}`);
            // Optimistically move to REGISTERED or bump score
            setProfiles((prev) =>
                prev.map((item) =>
                    item.id === profile.id
                        ? {
                              ...item,
                              engagement_score: (item.engagement_score || 0) + 15,
                              employer: item.employer
                                  ? { ...item.employer, recruitment_email: promptEmail }
                                  : item.employer,
                          }
                        : item
                )
            );
        } catch (err: any) {
            toast.error(err.message || "Failed to send invitation");
        } finally {
            setSendingInviteId(null);
        }
    };

    const copyWhatsAppMessage = (profile: CRMProfile) => {
        const company = profile.employer?.company_name || "your organization";
        const message = `Hello ${company} Team,\n\nWe are from Aganyu (https://aganyu.com), Malawi's talent platform. We noticed your open vacancies and featured them to connect you with qualified Malawian professionals.\n\nYou can claim your official company profile to review applicants and manage listings directly here:\nhttps://aganyu.com/register?role=employer&company=${encodeURIComponent(company)}\n\nLooking forward to supporting your hiring!`;

        navigator.clipboard.writeText(message);
        toast.success("WhatsApp outreach template copied to clipboard!");
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
                                        className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800 space-y-2"
                                    >
                                        {/* Company Name + Account Type Badge */}
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">
                                                {profile.employer?.company_name || "Unknown employer"}
                                            </p>
                                            {profile.employer?.account_type === "LEAD" && (
                                                <span className="shrink-0 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                                    <Building2 size={9} /> Lead
                                                </span>
                                            )}
                                        </div>

                                        {/* Industry · Location */}
                                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                            {[profile.employer?.industry, profile.employer?.location].filter(Boolean).join(" • ") || "No company details"}
                                        </p>

                                        {/* Recruitment email if present */}
                                        {profile.employer?.recruitment_email && (
                                            <p className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500 truncate">
                                                <Mail size={10} /> {profile.employer.recruitment_email}
                                            </p>
                                        )}

                                        {/* Priority + Score */}
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Badge
                                                label={profile.priority || "MEDIUM"}
                                                variant={priorityVariant(profile.priority || "MEDIUM")}
                                            />
                                            <span className="text-xs text-slate-400">
                                                Score {profile.engagement_score ?? 0}
                                            </span>
                                        </div>

                                        {/* Status Selector */}
                                        <select
                                            className="h-9 w-full rounded border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                                            value={profile.status}
                                            onChange={(e) => updateStatus(profile.id, e.target.value)}
                                        >
                                            {STATUSES.map((statusOption) => (
                                                <option key={statusOption} value={statusOption}>
                                                    {statusLabel(statusOption)}
                                                </option>
                                            ))}
                                        </select>

                                        {/* Outreach Actions — only for LEAD employers */}
                                        {profile.employer?.account_type === "LEAD" && (
                                            <div className="space-y-1.5 pt-1">
                                                <button
                                                    type="button"
                                                    onClick={() => sendClaimInvite(profile)}
                                                    disabled={sendingInviteId === profile.id}
                                                    className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/40 dark:hover:bg-blue-950/70 text-blue-700 dark:text-blue-300 py-1.5 text-[11px] font-semibold transition disabled:opacity-60"
                                                >
                                                    {sendingInviteId === profile.id ? (
                                                        <><Loader2 size={11} className="animate-spin" /> Sending...</>
                                                    ) : (
                                                        <><Send size={11} /> Send Email Invitation</>
                                                    )}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => copyWhatsAppMessage(profile)}
                                                    className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 py-1.5 text-[11px] font-semibold transition"
                                                    title="Copy pre-formatted message for WhatsApp HR outreach"
                                                >
                                                    <MessageCircle size={11} /> Copy WhatsApp Outreach
                                                </button>
                                            </div>
                                        )}
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
