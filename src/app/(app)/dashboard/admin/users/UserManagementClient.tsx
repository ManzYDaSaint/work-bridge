"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { PageHeader, Badge } from "@/components/dashboard/ui";
import { Users, Search, Loader2, UserX } from "lucide-react";
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
                const headers = ["ID", "Email", "Name", "Role", "Location", "Created At"];
                const csvData = data.users.map((u: any) => [
                    u.id,
                    u.email,
                    u.name ? `"${u.name.replace(/"/g, '""')}"` : "",
                    u.role,
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

    return (
        <div className="space-y-6 pb-20">
            <PageHeader
                title="Users"
                subtitle="Search the user directory without the extra visual noise."
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
                <div className="grid grid-cols-1 gap-2 border-b border-stone-200/70 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:border-slate-800 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]">
                    <span>User</span>
                    <span>Role</span>
                    <span className="sm:text-right">Action</span>
                </div>

                {initialUsers.length === 0 ? (
                    <div className="px-6 py-16 text-center">
                        <Users className="mx-auto text-slate-300 dark:text-slate-700" size={32} />
                        <p className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">No matching users.</p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Try broadening the search or clearing the role filter.</p>
                    </div>
                ) : (
                    initialUsers.map((user) => (
                        <div key={user.id} className="grid grid-cols-1 gap-4 border-b border-stone-200/70 px-4 py-4 last:border-b-0 dark:border-slate-800 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-center">
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{user.name || "Unnamed user"}</p>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge label={user.role.replace("_", " ")} variant={user.role === "ADMIN" ? "red" : user.role === "EMPLOYER" ? "yellow" : "blue"} />
                                <span className="text-xs text-slate-400">{user.location || "No location"}</span>
                            </div>
                            <div className="flex items-center sm:justify-end">
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
                    ))
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
        </div>
    );
}
