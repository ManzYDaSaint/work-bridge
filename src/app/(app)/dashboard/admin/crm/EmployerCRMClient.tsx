"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { apiFetch } from "@/lib/api";
import { Badge, PageHeader } from "@/components/dashboard/ui";
import {
    Send, Mail, Building2, Loader2, MessageCircle, Pencil,
    X, Globe, MapPin, Briefcase, Link2, FileText, BarChart2,
} from "lucide-react";
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
        recruitment_url?: string | null;
        description?: string | null;
        account_type?: string | null;
    } | null;
};

type EditForm = {
    companyName: string;
    industry: string;
    location: string;
    website: string;
    recruitmentEmail: string;
    recruitmentUrl: string;
    description: string;
    priority: "LOW" | "MEDIUM" | "HIGH";
    engagementScore: number;
};

const STATUSES = ["LEAD", "REGISTERED", "VERIFICATION_PENDING", "VERIFIED", "ACTIVE", "INACTIVE", "CHURNED"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;

function statusLabel(status: string) {
    return status.replaceAll("_", " ");
}

function priorityVariant(priority: string) {
    if (priority === "HIGH") return "red";
    if (priority === "LOW") return "slate";
    return "yellow";
}

const inputClass =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500";
const labelClass = "block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1";

/** Slide-over drawer for editing a CRM lead's details */
function EditLeadDrawer({
    profile,
    onClose,
    onSaved,
}: {
    profile: CRMProfile;
    onClose: () => void;
    onSaved: (profileId: string, patch: Partial<CRMProfile>) => void;
}) {
    const [saving, setSaving] = useState(false);
    const firstInputRef = useRef<HTMLInputElement>(null);

    const [form, setForm] = useState<EditForm>({
        companyName: profile.employer?.company_name || "",
        industry: profile.employer?.industry || "",
        location: profile.employer?.location || "",
        website: profile.employer?.website || "",
        recruitmentEmail: profile.employer?.recruitment_email || "",
        recruitmentUrl: profile.employer?.recruitment_url || "",
        description: profile.employer?.description || "",
        priority: (profile.priority as "LOW" | "MEDIUM" | "HIGH") || "LOW",
        engagementScore: profile.engagement_score ?? 0,
    });

    // Focus first field when drawer opens
    useEffect(() => {
        const id = setTimeout(() => firstInputRef.current?.focus(), 80);
        return () => clearTimeout(id);
    }, []);

    // Close on Escape key
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [onClose]);

    const set = (field: keyof EditForm) => (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile.employer?.id) {
            toast.error("No employer ID on this profile.");
            return;
        }
        if (!form.companyName.trim()) {
            toast.error("Company name is required.");
            return;
        }

        setSaving(true);
        try {
            const res = await apiFetch("/api/admin/employers/lead", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    employerId: profile.employer.id,
                    companyName: form.companyName,
                    industry: form.industry,
                    location: form.location,
                    website: form.website,
                    recruitmentEmail: form.recruitmentEmail,
                    recruitmentUrl: form.recruitmentUrl,
                    description: form.description,
                    priority: form.priority,
                    engagementScore: Number(form.engagementScore),
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to save");

            toast.success(data.message || "Details saved!");

            // Bubble updated data back to parent
            onSaved(profile.id, {
                priority: form.priority,
                engagement_score: Number(form.engagementScore),
                employer: {
                    ...profile.employer,
                    company_name: form.companyName,
                    industry: form.industry,
                    location: form.location,
                    website: form.website,
                    recruitment_email: form.recruitmentEmail,
                    recruitment_url: form.recruitmentUrl,
                    description: form.description,
                },
            });
            onClose();
        } catch (err: any) {
            toast.error(err.message || "Failed to save changes");
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Drawer panel */}
            <aside
                className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl dark:bg-slate-900 overflow-hidden"
                role="dialog"
                aria-modal="true"
                aria-label="Edit Employer Lead"
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-5 py-4">
                    <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/50">
                            <Pencil size={15} className="text-indigo-600 dark:text-indigo-400" />
                        </span>
                        <div>
                            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Edit Lead Details</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs">
                                {profile.employer?.company_name || "Employer"}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 transition"
                        aria-label="Close drawer"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Scrollable form body */}
                <form
                    onSubmit={handleSave}
                    className="flex flex-1 flex-col overflow-y-auto"
                >
                    <div className="space-y-5 px-5 py-5">
                        {/* Company Name */}
                        <div>
                            <label className={labelClass}>
                                <Briefcase size={11} className="inline mr-1" />Company Name *
                            </label>
                            <input
                                ref={firstInputRef}
                                type="text"
                                className={inputClass}
                                value={form.companyName}
                                onChange={set("companyName")}
                                placeholder="e.g. Airtel Malawi"
                                required
                            />
                        </div>

                        {/* Industry */}
                        <div>
                            <label className={labelClass}>
                                <Briefcase size={11} className="inline mr-1" />Industry
                            </label>
                            <input
                                type="text"
                                className={inputClass}
                                value={form.industry}
                                onChange={set("industry")}
                                placeholder="e.g. Telecommunications"
                            />
                        </div>

                        {/* Location */}
                        <div>
                            <label className={labelClass}>
                                <MapPin size={11} className="inline mr-1" />Location
                            </label>
                            <input
                                type="text"
                                className={inputClass}
                                value={form.location}
                                onChange={set("location")}
                                placeholder="e.g. Blantyre, Malawi"
                            />
                        </div>

                        {/* Website */}
                        <div>
                            <label className={labelClass}>
                                <Globe size={11} className="inline mr-1" />Company Website
                            </label>
                            <input
                                type="url"
                                className={inputClass}
                                value={form.website}
                                onChange={set("website")}
                                placeholder="https://example.com"
                            />
                        </div>

                        <hr className="border-slate-100 dark:border-slate-800" />

                        {/* Recruitment Email */}
                        <div>
                            <label className={labelClass}>
                                <Mail size={11} className="inline mr-1" />Recruitment / HR Email
                            </label>
                            <input
                                type="email"
                                className={inputClass}
                                value={form.recruitmentEmail}
                                onChange={set("recruitmentEmail")}
                                placeholder="hr@example.com"
                            />
                            <p className="mt-1 text-[11px] text-slate-400">
                                Used when sending the claim invitation email.
                            </p>
                        </div>

                        {/* Recruitment / Career Portal URL */}
                        <div>
                            <label className={labelClass}>
                                <Link2 size={11} className="inline mr-1" />Career Portal / Job Board URL
                            </label>
                            <input
                                type="url"
                                className={inputClass}
                                value={form.recruitmentUrl}
                                onChange={set("recruitmentUrl")}
                                placeholder="https://careers.example.com"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className={labelClass}>
                                <FileText size={11} className="inline mr-1" />Company Description
                            </label>
                            <textarea
                                rows={4}
                                className={`${inputClass} resize-none`}
                                value={form.description}
                                onChange={set("description")}
                                placeholder="Brief description of the employer..."
                            />
                        </div>

                        <hr className="border-slate-100 dark:border-slate-800" />

                        {/* CRM Priority + Score */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelClass}>
                                    <BarChart2 size={11} className="inline mr-1" />Priority
                                </label>
                                <select
                                    className={inputClass}
                                    value={form.priority}
                                    onChange={set("priority")}
                                >
                                    {PRIORITIES.map((p) => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>
                                    <BarChart2 size={11} className="inline mr-1" />Engagement Score
                                </label>
                                <input
                                    type="number"
                                    min={0}
                                    max={999}
                                    className={inputClass}
                                    value={form.engagementScore}
                                    onChange={set("engagementScore")}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Footer actions — always visible at bottom */}
                    <div className="mt-auto border-t border-slate-200 dark:border-slate-700 px-5 py-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition"
                        >
                            {saving ? (
                                <><Loader2 size={14} className="animate-spin" /> Saving...</>
                            ) : (
                                "Save Changes"
                            )}
                        </button>
                    </div>
                </form>
            </aside>
        </>
    );
}

export default function EmployerCRMClient({ initialProfiles }: { initialProfiles: CRMProfile[] }) {
    const [profiles, setProfiles] = useState(initialProfiles);
    const [editingProfile, setEditingProfile] = useState<CRMProfile | null>(null);

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

    const handleEditSaved = (profileId: string, patch: Partial<CRMProfile>) => {
        setProfiles((prev) =>
            prev.map((item) =>
                item.id === profileId
                    ? {
                          ...item,
                          ...patch,
                          employer: { ...item.employer, ...patch.employer },
                      }
                    : item
            )
        );
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
                                        {/* Company Name + badges + edit button */}
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">
                                                {profile.employer?.company_name || "Unknown employer"}
                                            </p>
                                            <div className="flex shrink-0 items-center gap-1">
                                                {profile.employer?.account_type === "LEAD" && (
                                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                                        <Building2 size={9} /> Lead
                                                    </span>
                                                )}
                                                {/* Edit button — available on all profiles */}
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingProfile(profile)}
                                                    title="Edit lead details"
                                                    className="flex items-center justify-center rounded p-1 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-400 transition"
                                                >
                                                    <Pencil size={12} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Industry · Location */}
                                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                            {[profile.employer?.industry, profile.employer?.location].filter(Boolean).join(" • ") || "No company details"}
                                        </p>

                                        {/* Recruitment email */}
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

            {/* Edit Lead Drawer */}
            {editingProfile && (
                <EditLeadDrawer
                    profile={editingProfile}
                    onClose={() => setEditingProfile(null)}
                    onSaved={handleEditSaved}
                />
            )}
        </div>
    );
}
