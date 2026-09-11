"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { PageHeader, Badge } from "@/components/dashboard/ui";
import { Users, Search, Loader2, UserX, Crown, Sparkles, X, CheckCircle2, UserCheck, Building2, Shield, Download, Target, AlertTriangle, Eye, Send, FileText, RefreshCw, Cpu } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { calculateProfileStrength } from "@/lib/profile-strength";


export default function UserManagementClient({ 
    initialUsers, 
    initialTotal
}: { 
    initialUsers: any[]; 
    initialTotal: number;
    initialSearchParams?: {
        page: string;
        search: string;
        role: string;
    }
}) {
    const [actioning, setActioning] = useState<string | null>(null);
    const [selectedUserForPremium, setSelectedUserForPremium] = useState<any | null>(null);
    const [inspectingUser, setInspectingUser] = useState<any | null>(null);
    const [inspectData, setInspectData] = useState<any | null>(null);
    const [loadingInspect, setLoadingInspect] = useState<boolean>(false);
    const [durationMonths, setDurationMonths] = useState<number>(1);
    const [updatingSub, setUpdatingSub] = useState<boolean>(false);
    const [sendingNotification, setSendingNotification] = useState<boolean>(false);

    const router = useRouter();
    const searchParams = useSearchParams();
    
    const page = parseInt(searchParams.get("page") || "1");
    const searchTerm = searchParams.get("search") || "";
    const roleFilter = searchParams.get("role") || "ALL";
    const limit = 50;

    const updateFilters = (updates: Record<string, string | number>) => {
        const params = new URLSearchParams(searchParams.toString());
        
        Object.entries(updates).forEach(([key, value]) => {
            if (value === "" || value === "ALL") {
                params.delete(key);
            } else {
                params.set(key, String(value));
            }
        });

        // Reset page to 1 when filters change
        if (!updates.page) {
            params.set("page", "1");
        }

        router.push(`/dashboard/admin/users?${params.toString()}`);
    };

    const handleDownloadCSV = async () => {
        toast.loading("Exporting users...");
        try {
            const params = new URLSearchParams();
            params.set("page", "1");
            params.set("limit", "100000");
            if (searchTerm) params.set("search", searchTerm);
            if (roleFilter !== "ALL") params.set("role", roleFilter);

            const res = await apiFetch(`/api/admin/users?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                const headers = ["ID", "Email", "Name", "Role", "Plan", "Location", "Created At"];
                const csvData = data.users.map((u: any) => [
                    u.id,
                    u.email,
                    u.name ? `"${u.name.replace(/"/g, '""')}"` : "",
                    u.role,
                    u.plan || "FREE",
                    u.location ? `"${u.location.replace(/"/g, '""')}"` : "",
                    u.createdAt
                ].join(","));
                const csvStr = [headers.join(","), ...csvData].join("\n");
                const blob = new Blob([csvStr], { type: "text/csv" });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `users_export_${new Date().toISOString().split("T")[0]}.csv`;
                a.click();
                toast.dismiss();
                toast.success("Export complete");
            }
        } catch {
            toast.dismiss();
            toast.error("Export failed");
        }
    };

    const handleDelete = async (userId: string, email: string) => {
        if (!confirm(`Delete ${email}? This also removes related platform data.`)) return;
        setActioning(userId);
        try {
            const res = await apiFetch(`/api/admin/users?userId=${userId}`, { method: "DELETE" });
            if (res.ok) {
                toast.success("User deleted successfully");
                router.refresh();
            } else {
                toast.error("Deletion failed.");
            }
        } finally {
            setActioning(null);
        }
    };

    const handleSubscriptionAction = async (action: "GRANT" | "REVOKE") => {
        if (!selectedUserForPremium) return;
        setUpdatingSub(true);
        try {
            const res = await apiFetch("/api/admin/subscriptions", {
                method: "POST",
                body: JSON.stringify({
                    userId: selectedUserForPremium.id,
                    seekerId: selectedUserForPremium.seekerId,
                    action,
                    durationMonths
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                toast.success(action === "GRANT" ? `Granted ${durationMonths} month(s) Premium!` : "Revoked Premium subscription");
                setSelectedUserForPremium(null);
                router.refresh();
            } else {
                toast.error(data.error || "Subscription update failed");
            }
        } catch {
            toast.error("Subscription request failed");
        } finally {
            setUpdatingSub(false);
        }
    };

    const handleInspectUser = async (user: any) => {
        setInspectingUser(user);
        setLoadingInspect(true);
        setInspectData(null);
        try {
            const params = new URLSearchParams();
            params.set("userId", user.id);
            if (user.seekerId) params.set("seekerId", user.seekerId);

            const res = await apiFetch(`/api/admin/users/inspect?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setInspectData(data);
            } else {
                toast.error("Failed to load user inspection details");
            }
        } catch {
            toast.error("Network error while inspecting user");
        } finally {
            setLoadingInspect(false);
        }
    };

    const handleRecalculateEmbedding = async (user: any) => {
        toast.loading("Recalculating AI embeddings & DNA hash...");
        try {
            const res = await apiFetch("/api/admin/users/actions", {
                method: "POST",
                body: JSON.stringify({
                    action: "RECALCULATE_EMBEDDING",
                    userId: user.id,
                    seekerId: user.seekerId
                })
            });

            const data = await res.json();
            toast.dismiss();
            if (res.ok && data.success) {
                toast.success(data.message || "AI profile embedding updated!");
                if (inspectingUser?.id === user.id) {
                    handleInspectUser(user);
                }
            } else {
                toast.error(data.error || "Failed to recalculate embeddings");
            }
        } catch {
            toast.dismiss();
            toast.error("Embedding request failed");
        }
    };

    const handleSendMatchNotifications = async (user: any) => {
        if (!user.seekerId) {
            toast.error("This user has no seeker profile to notify.");
            return;
        }
        const isPremium = user.plan === "PREMIUM" || user.subscription?.status === "ACTIVE";
        const channel = isPremium ? "WhatsApp" : "Email";
        if (!confirm(`Send ${channel} match notifications to ${user.name || user.email}?\n\nChannel: ${channel}${isPremium ? ` → ${user.phone || "(no phone number)"}` : ` → ${user.email}`}`)) return;

        setSendingNotification(true);
        toast.loading(`Sending ${channel} match notifications...`);
        try {
            const res = await apiFetch("/api/admin/users/actions", {
                method: "POST",
                body: JSON.stringify({
                    action: "SEND_MATCH_NOTIFICATIONS",
                    userId: user.id,
                    seekerId: user.seekerId
                })
            });
            const data = await res.json();
            toast.dismiss();
            if (res.ok && data.success) {
                toast.success(data.message || `${channel} notifications sent!`);
                // Reload the drawer to refresh telemetry logs
                if (inspectingUser?.id === user.id) {
                    handleInspectUser(user);
                }
            } else {
                toast.warning(data.message || data.error || `${channel} notification failed.`);
            }
        } catch {
            toast.dismiss();
            toast.error(`Failed to send ${channel} notifications.`);
        } finally {
            setSendingNotification(false);
        }
    };

    const tabs = [
        { key: "ALL", label: "All Users", icon: <Users size={14} /> },
        { key: "PREMIUM", label: "Premium Subscribers", icon: <Crown size={14} className="text-amber-500" /> },
        { key: "JOB_SEEKER", label: "Job Seekers", icon: <UserCheck size={14} /> },
        { key: "EMPLOYER", label: "Employers", icon: <Building2 size={14} /> },
        { key: "ADMIN", label: "Admins", icon: <Shield size={14} /> },
    ] as const;

    return (
        <div className="space-y-6 pb-20">
            <PageHeader
                title="Users"
                subtitle="Search user directory, manage roles, and grant Aganyu Premium access."
            />

            {/* Tabs Navigation & Search Toolbar */}
            <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-stone-200 dark:border-slate-800">
                    <div className="flex overflow-x-auto">
                        {tabs.map(t => (
                            <button
                                key={t.key}
                                onClick={() => updateFilters({ role: t.key, page: 1 })}
                                className={`inline-flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-semibold transition-colors whitespace-nowrap ${
                                    roleFilter === t.key
                                        ? "border-amber-500 text-amber-600 dark:text-amber-400"
                                        : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400"
                                }`}
                            >
                                {t.icon} {t.label}
                            </button>
                        ))}
                    </div>

                    <button onClick={handleDownloadCSV} className="mb-2 inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-stone-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 shrink-0">
                        <Download size={14} /> Export CSV
                    </button>
                </div>

                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        defaultValue={searchTerm}
                        onChange={(e) => updateFilters({ search: e.target.value, page: 1 })}
                        onKeyDown={(e) => e.key === 'Enter' && updateFilters({ search: (e.target as HTMLInputElement).value, page: 1 })}
                        className="w-full rounded-2xl border border-stone-200 bg-white px-12 py-3 text-sm outline-none focus:border-stone-300 dark:border-slate-700 dark:bg-slate-900"
                    />
                </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/70">
                <div className="grid grid-cols-1 gap-2 border-b border-stone-200/70 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:border-slate-800 sm:grid-cols-[minmax(0,1.8fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_auto]">
                    <span>User & Contact</span>
                    <span>Role & Plan</span>
                    <span>Match Readiness</span>
                    <span className="sm:text-right">Actions</span>
                </div>

                {(() => {
                    const displayedUsers = roleFilter === "PREMIUM"
                        ? initialUsers.filter(u => u.plan === "PREMIUM" || u.plan === "PRO" || u.subscription?.status === "ACTIVE")
                        : initialUsers;

                    if (displayedUsers.length === 0) {
                        return (
                            <div className="px-6 py-16 text-center">
                                <Users className="mx-auto text-slate-300 dark:text-slate-700" size={32} />
                                <p className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">No matching users.</p>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Try broadening the search or clearing the role filter.</p>
                            </div>
                        );
                    }

                    return displayedUsers.map((user) => {
                        const isPremium = user.plan === "PREMIUM" || user.plan === "PRO" || user.subscription?.status === "ACTIVE";
                        const seekerStrength = user.role === "JOB_SEEKER" ? calculateProfileStrength(user.seekerProfile) : null;

                        return (
                            <div key={user.id} className="grid grid-cols-1 gap-4 border-b border-stone-200/70 px-4 py-4 last:border-b-0 dark:border-slate-800 sm:grid-cols-[minmax(0,1.8fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_auto] sm:items-center">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{user.name || "Unnamed user"}</p>
                                        {isPremium && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                                <Crown size={10} /> PREMIUM
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                                    {user.phone && <p className="text-[11px] text-slate-400">WhatsApp: {user.phone}</p>}
                                </div>
                                
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge label={user.role.replace("_", " ")} variant={user.role === "ADMIN" ? "red" : user.role === "EMPLOYER" ? "yellow" : "blue"} />
                                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                        isPremium 
                                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                    }`}>
                                        {isPremium ? "Active Premium" : "Free Plan"}
                                    </span>
                                </div>

                                <div>
                                    {seekerStrength ? (
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                                    <div
                                                        className={`h-full rounded-full transition-all ${
                                                            seekerStrength.percentage >= 80
                                                                ? "bg-emerald-500"
                                                                : seekerStrength.percentage >= 50
                                                                ? "bg-amber-500"
                                                                : "bg-red-500"
                                                        }`}
                                                        style={{ width: `${seekerStrength.percentage}%` }}
                                                    />
                                                </div>
                                                <span className={`text-xs font-bold ${
                                                    seekerStrength.percentage >= 80
                                                        ? "text-emerald-600 dark:text-emerald-400"
                                                        : seekerStrength.percentage >= 50
                                                        ? "text-amber-600 dark:text-amber-400"
                                                        : "text-red-600 dark:text-red-400"
                                                }`}>
                                                    {seekerStrength.percentage}%
                                                </span>
                                            </div>
                                            {seekerStrength.suggestions.length > 0 ? (
                                                <p className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400" title={seekerStrength.suggestions.join(" • ")}>
                                                    <AlertTriangle size={11} className="shrink-0" />
                                                    <span className="truncate max-w-[160px]">{seekerStrength.suggestions[0]}</span>
                                                </p>
                                            ) : (
                                                <p className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                                                    <Target size={11} className="shrink-0" /> Ready for AI Match
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-xs text-slate-400 italic">N/A ({user.role})</span>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 sm:justify-end">
                                    <button
                                        onClick={() => handleInspectUser(user)}
                                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-stone-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-stone-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                                        title="Inspect matches & details"
                                    >
                                        <Eye size={14} /> Inspect
                                    </button>

                                    {user.role === "JOB_SEEKER" && (
                                        <button
                                            onClick={() => setSelectedUserForPremium(user)}
                                            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50/50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300"
                                        >
                                            <Sparkles size={14} /> Premium
                                        </button>
                                    )}

                                    <button
                                        onClick={() => handleDelete(user.id, user.email)}
                                        disabled={actioning === user.id}
                                        className="rounded-xl border border-stone-200 p-2 text-slate-500 hover:text-red-600 dark:border-slate-700 dark:text-slate-300"
                                        title="Delete user"
                                    >
                                        {actioning === user.id ? <Loader2 size={16} className="animate-spin" /> : <UserX size={16} />}
                                    </button>
                                </div>
                            </div>
                        );
                    });
                })()}
            </div>
            
            {initialTotal > limit && (
                <div className="flex items-center justify-between mt-6 px-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Showing {(page - 1) * limit + 1} to {Math.min(page * limit, initialTotal)} of {initialTotal}
                    </p>
                    <div className="flex gap-2">
                        <button
                            disabled={page === 1}
                            onClick={() => updateFilters({ page: page - 1 })}
                            className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
                        >
                            Previous
                        </button>
                        <button
                            disabled={page * limit >= initialTotal}
                            onClick={() => updateFilters({ page: page + 1 })}
                            className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {/* Premium Subscription Management Modal */}
            {selectedUserForPremium && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex items-center justify-between border-b border-stone-100 pb-4 dark:border-slate-800">
                            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-lg">
                                <Crown size={22} /> Aganyu Premium Access
                            </div>
                            <button 
                                onClick={() => setSelectedUserForPremium(null)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="mt-4 space-y-3">
                            <p className="text-sm text-slate-600 dark:text-slate-300">
                                Managing Premium Status for:
                            </p>
                            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                                <p className="font-semibold text-slate-900 dark:text-white">{selectedUserForPremium.name}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{selectedUserForPremium.email}</p>
                                {selectedUserForPremium.phone && (
                                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">WhatsApp: {selectedUserForPremium.phone}</p>
                                )}
                            </div>

                            <div className="space-y-2 pt-2">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Duration (Months)
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {[1, 3, 6, 12].map((m) => (
                                        <button
                                            key={m}
                                            type="button"
                                            onClick={() => setDurationMonths(m)}
                                            className={`rounded-xl border py-2 text-xs font-bold transition-all ${
                                                durationMonths === m
                                                    ? "border-amber-500 bg-amber-500 text-white shadow-md shadow-amber-500/20"
                                                    : "border-stone-200 bg-white text-slate-700 hover:bg-stone-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                            }`}
                                        >
                                            {m} Mo{m > 1 ? "s" : ""}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex items-center justify-between gap-3 pt-4 border-t border-stone-100 dark:border-slate-800">
                            {(selectedUserForPremium.plan === "PREMIUM" || selectedUserForPremium.subscription?.status === "ACTIVE") ? (
                                <button
                                    onClick={() => handleSubscriptionAction("REVOKE")}
                                    disabled={updatingSub}
                                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400"
                                >
                                    Revoke Premium
                                </button>
                            ) : <div />}

                            <div className="flex gap-2">
                                <button
                                    onClick={() => setSelectedUserForPremium(null)}
                                    className="rounded-xl border border-stone-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-stone-50 dark:border-slate-700 dark:text-slate-300"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleSubscriptionAction("GRANT")}
                                    disabled={updatingSub}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-amber-500/30 hover:bg-amber-600"
                                >
                                    {updatingSub ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                    Grant {durationMonths} Mo Premium
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Slide-over User Inspection Drawer */}
            {inspectingUser && (
                <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
                    <div className="h-full w-full max-w-xl overflow-y-auto border-l border-stone-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex items-center justify-between border-b border-stone-200 pb-4 dark:border-slate-800">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Target className="text-amber-500" size={20} /> Match Inspection Drawer
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Inspecting real-time matching telemetry for {inspectingUser.name}
                                </p>
                            </div>
                            <button
                                onClick={() => setInspectingUser(null)}
                                className="rounded-xl border border-stone-200 p-2 text-slate-400 hover:text-slate-700 dark:border-slate-700 dark:hover:text-slate-200"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {loadingInspect ? (
                            <div className="flex h-64 items-center justify-center">
                                <Loader2 size={24} className="animate-spin text-amber-500" />
                                <span className="ml-2 text-sm text-slate-500">Fetching matching telemetry...</span>
                            </div>
                        ) : inspectData ? (
                            <div className="mt-6 space-y-6">
                                {/* Admin AI Control Toolbar */}
                                {inspectingUser.role === "JOB_SEEKER" && (
                                    <div className="flex items-center justify-between rounded-2xl border border-amber-200/80 bg-amber-50/40 p-3.5 dark:border-amber-900/40 dark:bg-amber-950/20">
                                        <div>
                                            <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                                <Cpu size={14} className="text-amber-500" /> AI Engine Controls
                                            </p>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                                Refresh candidate DNA vector embeddings for real-time matching
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleRecalculateEmbedding(inspectingUser)}
                                            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-600 shadow-xs"
                                        >
                                            <RefreshCw size={12} /> Refresh Embeddings
                                        </button>
                                    </div>
                                )}

                                {/* Profile Summary */}
                                <div className="rounded-2xl border border-stone-200/80 bg-stone-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-white">{inspectData.user.email}</p>
                                            <p className="text-xs text-slate-500">Role: <Badge label={inspectData.user.role} variant="blue" /></p>
                                        </div>
                                        {inspectingUser.seekerProfile && (
                                            <div className="text-right">
                                                <span className="text-xs text-slate-400">Readiness:</span>
                                                <p className="text-sm font-extrabold text-amber-600 dark:text-amber-400">
                                                    {calculateProfileStrength(inspectingUser.seekerProfile).percentage}%
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {inspectingUser.seekerProfile?.skills?.length > 0 && (
                                        <div className="mt-3">
                                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Key Tags & Skills</p>
                                            <div className="mt-1 flex flex-wrap gap-1">
                                                {inspectingUser.seekerProfile.skills.map((s: string, idx: number) => (
                                                    <span key={idx} className="rounded-md bg-stone-200 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                                        {s}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Active Recommended Jobs Section */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <h4 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-500">
                                            <Sparkles size={14} className="text-amber-500" /> Active Job Matches ({inspectData.matches.length})
                                        </h4>
                                        {inspectData.matches.length > 0 && (
                                            <button
                                                onClick={() => handleSendMatchNotifications(inspectingUser)}
                                                disabled={sendingNotification}
                                                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold shadow-sm transition-all disabled:opacity-60 ${
                                                    (inspectingUser.plan === "PREMIUM" || inspectingUser.subscription?.status === "ACTIVE")
                                                        ? "bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20"
                                                        : "bg-blue-500 text-white hover:bg-blue-600 shadow-blue-500/20"
                                                }`}
                                                title={(inspectingUser.plan === "PREMIUM" || inspectingUser.subscription?.status === "ACTIVE") ? "Send WhatsApp notifications (Premium)" : "Send Email notifications (Non-Premium)"}
                                            >
                                                {sendingNotification ? (
                                                    <Loader2 size={12} className="animate-spin" />
                                                ) : (inspectingUser.plan === "PREMIUM" || inspectingUser.subscription?.status === "ACTIVE") ? (
                                                    <Send size={12} />
                                                ) : (
                                                    <FileText size={12} />
                                                )}
                                                {(inspectingUser.plan === "PREMIUM" || inspectingUser.subscription?.status === "ACTIVE") ? "Notify via WhatsApp" : "Notify via Email"}
                                            </button>
                                        )}
                                    </div>
                                    {inspectData.matches.length === 0 ? (
                                        <div className="mt-2 rounded-xl border border-stone-200/60 p-4 text-center text-xs text-slate-400 dark:border-slate-800">
                                            No active job matches found for this candidate.
                                        </div>
                                    ) : (
                                        <div className="mt-2 space-y-2.5">
                                            {inspectData.matches.map((m: any) => (
                                                <div key={m.id} className="rounded-xl border border-stone-200 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                                                    <div className="flex items-center justify-between">
                                                        <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                                                            {m.title}
                                                        </p>
                                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                                                            m.match_score >= 80 
                                                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" 
                                                                : m.match_score >= 50
                                                                ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                                                                : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                                                        }`}>
                                                            {m.match_score}% Match
                                                        </span>
                                                    </div>
                                                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                                                        {m.company} • {m.location} ({m.workMode || "REMOTE"})
                                                    </p>
                                                    {m.match_reasons?.length > 0 && (
                                                        <div className="mt-1.5 flex flex-wrap gap-1">
                                                            {m.match_reasons.map((r: string, idx: number) => (
                                                                <span key={idx} className="inline-block rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                                                                    {r}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Channel Notification Logs */}
                                <div>
                                    <h4 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-500">
                                        <Send size={14} className="text-emerald-500" /> WhatsApp & Dispatch Telemetry
                                    </h4>
                                    {inspectData.notifications.length === 0 ? (
                                        <div className="mt-2 rounded-xl border border-stone-200/60 p-4 text-center text-xs text-slate-400 dark:border-slate-800">
                                            No outbound notification logs recorded.
                                        </div>
                                    ) : (
                                        <div className="mt-2 space-y-2">
                                            {inspectData.notifications.map((n: any) => (
                                                <div key={n.id} className="flex items-center justify-between rounded-xl border border-stone-200 p-2.5 text-xs dark:border-slate-800">
                                                    <div>
                                                        <p className="font-semibold text-slate-800 dark:text-slate-200">{n.template_name || "Match Alert"}</p>
                                                        <p className="text-[10px] text-slate-400">{new Date(n.created_at).toLocaleString()}</p>
                                                    </div>
                                                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                                        {n.status || "SENT"}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}
        </div>
    );
}
