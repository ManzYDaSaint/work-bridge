"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { PageHeader, Badge } from "@/components/dashboard/ui";
import { Users, Search, Loader2, UserX } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function UserManagementPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState("ALL");
    const [actioning, setActioning] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await apiFetch("/api/admin/users");
                if (res.ok) {
                    setUsers(await res.json());
                }
            } catch {
                toast.error("Could not load users.");
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, []);

    const handleDelete = async (userId: string, email: string) => {
        if (!confirm(`Delete ${email}? This also removes related platform data.`)) return;
        setActioning(userId);
        try {
            const res = await apiFetch(`/api/admin/users?userId=${userId}`, { method: "DELETE" });
            if (res.ok) {
                setUsers((prev) => prev.filter((u) => u.id !== userId));
                router.refresh();
            } else {
                toast.error("Deletion failed.");
            }
        } finally {
            setActioning(null);
        }
    };

    const filteredUsers = users.filter((user) => {
        const matchesSearch =
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesRole = roleFilter === "ALL" || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#16324f]" />
            </div>
        );
    }

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
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full rounded-2xl border border-stone-200 bg-white px-12 py-3 text-sm outline-none focus:border-stone-300 dark:border-slate-700 dark:bg-slate-900"
                    />
                </div>
                <div className="flex flex-wrap gap-2">
                    {["ALL", "JOB_SEEKER", "EMPLOYER", "ADMIN"].map((role) => (
                        <button
                            key={role}
                            onClick={() => setRoleFilter(role)}
                            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                                roleFilter === role
                                    ? "border-[#16324f] bg-[#16324f] text-white"
                                    : "border-stone-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                            }`}
                        >
                            {role.replace("_", " ")}
                        </button>
                    ))}
                </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/70">
                <div className="grid grid-cols-1 gap-2 border-b border-stone-200/70 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:border-slate-800 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]">
                    <span>User</span>
                    <span>Role</span>
                    <span className="sm:text-right">Action</span>
                </div>

                {filteredUsers.length === 0 ? (
                    <div className="px-6 py-16 text-center">
                        <Users className="mx-auto text-slate-300 dark:text-slate-700" size={32} />
                        <p className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">No matching users.</p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Try broadening the search or clearing the role filter.</p>
                    </div>
                ) : (
                    filteredUsers.map((user) => (
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
        </div>
    );
}
