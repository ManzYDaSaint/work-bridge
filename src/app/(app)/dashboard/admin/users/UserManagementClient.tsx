"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { PageHeader, Badge } from "@/components/dashboard/ui";
import { Users, Search, Loader2, UserX, Crown, Sparkles, X, CheckCircle2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

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
    const [durationMonths, setDurationMonths] = useState<number>(1);
    const [updatingSub, setUpdatingSub] = useState<boolean>(false);

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

    return (
        <div className="space-y-6 pb-20">
            <PageHeader
                title="Users"
                subtitle="Search user directory, manage roles, and grant Aganyu Premium access."
            />

            <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by name or email"
                        defaultValue={searchTerm}
                        onChange={(e) => updateFilters({ search: e.target.value, page: 1 })}
                        onKeyDown={(e) => e.key === 'Enter' && updateFilters({ search: (e.target as HTMLInputElement).value, page: 1 })}
                        className="w-full rounded-2xl border border-stone-200 bg-white px-12 py-3 text-sm outline-none focus:border-stone-300 dark:border-slate-700 dark:bg-slate-900"
                    />
                </div>
                <div className="flex flex-wrap gap-2">
                    {["ALL", "JOB_SEEKER", "EMPLOYER", "ADMIN"].map((role) => (
                        <button
                            key={role}
                            onClick={() => updateFilters({ role: role, page: 1 })}
                            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                                roleFilter === role
                                    ? "border-[#16324f] bg-[#16324f] text-white"
                                    : "border-stone-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                            }`}
                        >
                            {role.replace("_", " ")}
                        </button>
                    ))}
                    <button onClick={handleDownloadCSV} className="rounded-full border border-stone-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-stone-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
                        Export CSV
                    </button>
                </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/70">
                <div className="grid grid-cols-1 gap-2 border-b border-stone-200/70 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:border-slate-800 sm:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_auto]">
                    <span>User & Contact</span>
                    <span>Role & Plan</span>
                    <span className="sm:text-right">Actions</span>
                </div>

                {initialUsers.length === 0 ? (
                    <div className="px-6 py-16 text-center">
                        <Users className="mx-auto text-slate-300 dark:text-slate-700" size={32} />
                        <p className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">No matching users.</p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Try broadening the search or clearing the role filter.</p>
                    </div>
                ) : (
                    initialUsers.map((user) => {
                        const isPremium = user.plan === "PREMIUM" || user.plan === "PRO" || user.subscription?.status === "ACTIVE";

                        return (
                            <div key={user.id} className="grid grid-cols-1 gap-4 border-b border-stone-200/70 px-4 py-4 last:border-b-0 dark:border-slate-800 sm:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_auto] sm:items-center">
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

                                <div className="flex items-center gap-2 sm:justify-end">
                                    {user.role === "JOB_SEEKER" && (
                                        <button
                                            onClick={() => setSelectedUserForPremium(user)}
                                            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50/50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300"
                                        >
                                            <Sparkles size={14} /> Manage Premium
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
                    })
                )}
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
        </div>
    );
}
