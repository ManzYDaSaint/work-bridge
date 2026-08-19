"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { PageHeader, Badge } from "@/components/dashboard/ui";
import { Crown, RefreshCw, Loader2, Sparkles, AlertTriangle, XCircle, Clock, CreditCard, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
    return (
        <div className={`rounded-2xl border p-5 shadow-sm ${color}`}>
            <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider opacity-70">{label}</p>
                {icon}
            </div>
            <p className="mt-2 text-3xl font-extrabold">{value}</p>
        </div>
    );
}

function SubTable({ items, title, emptyMsg, columns }: { items: any[]; title: string; emptyMsg: string; columns: { label: string; render: (s: any) => React.ReactNode }[] }) {
    if (!items.length) return (
        <div className="rounded-2xl border border-stone-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-900">
            <p className="font-semibold text-slate-900 dark:text-white">{title}</p>
            <p className="mt-1 text-sm text-slate-400">{emptyMsg}</p>
        </div>
    );
    return (
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-stone-100 px-5 py-3 dark:border-slate-800">
                <p className="text-sm font-bold text-slate-900 dark:text-white">{title} <span className="ml-1 rounded-full bg-stone-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">{items.length}</span></p>
            </div>
            <div className="divide-y divide-stone-100 dark:divide-slate-800">
                {items.slice(0, 10).map((item, i) => (
                    <div key={i} className="grid gap-4 px-5 py-3.5 text-sm" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0,1fr))` }}>
                        {columns.map((col, j) => <div key={j}>{col.render(item)}</div>)}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function PremiumDashboardClient() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [tab, setTab] = useState<"ACTIVE" | "EXPIRING" | "EXPIRED" | "CANCELLED">("ACTIVE");

    const fetch = async () => {
        setLoading(true);
        try {
            const res = await apiFetch("/api/admin/premium");
            if (res.ok) setData(await res.json());
            else toast.error("Failed to load premium data");
        } catch { toast.error("Network error"); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetch(); }, []);

    const seeker = (s: any) => Array.isArray(s.job_seekers) ? s.job_seekers[0] : s.job_seekers;

    const subCols = [
        { label: "Seeker", render: (s: any) => {
            const sk = seeker(s);
            return (<><p className="font-semibold text-slate-900 dark:text-white text-xs">{sk?.full_name || "—"}</p><p className="text-[11px] text-slate-400">{sk?.phone || "No phone"}</p></>);
        }},
        { label: "Plan Ends", render: (s: any) => (
            <p className="text-xs text-slate-700 dark:text-slate-300">{new Date(s.ends_at).toLocaleDateString()}</p>
        )},
        { label: "Provider", render: (s: any) => (
            <Badge label={s.payment_provider === "ADMIN_MANUAL" ? "Admin Grant" : (s.payment_provider || "Unknown")} variant={s.payment_provider === "ADMIN_MANUAL" ? "yellow" : "blue"} />
        )},
        { label: "Status", render: (s: any) => (
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${s.status === "ACTIVE" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "bg-stone-100 text-slate-500 dark:bg-slate-800"}`}>{s.status}</span>
        )},
    ];

    const tabs = [
        { key: "ACTIVE", label: "Active", icon: <Crown size={14} />, items: data?.active || [] },
        { key: "EXPIRING", label: "Expiring Soon", icon: <Clock size={14} />, items: data?.expiringSoon || [] },
        { key: "EXPIRED", label: "Expired", icon: <AlertTriangle size={14} />, items: data?.expired || [] },
        { key: "CANCELLED", label: "Cancelled", icon: <XCircle size={14} />, items: data?.cancelled || [] },
    ] as const;

    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-center justify-between">
                <PageHeader title="Premium Subscriptions" subtitle="Manage and monitor all Aganyu Premium memberships in real time." />
                <button onClick={fetch} className="rounded-xl border border-stone-200 p-2 text-slate-400 hover:text-slate-700 dark:border-slate-700"><RefreshCw size={16} className={loading ? "animate-spin" : ""} /></button>
            </div>

            {loading && !data ? (
                <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-amber-500" size={28} /></div>
            ) : (
                <>
                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                        <StatCard label="Active" value={data?.stats?.totalActive || 0} icon={<Crown size={20} className="text-amber-500" />} color="border-amber-200 bg-amber-50/60 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100" />
                        <StatCard label="Expiring in 7 Days" value={data?.stats?.expiringSoon || 0} icon={<Clock size={20} className="text-orange-500" />} color="border-orange-200 bg-orange-50/60 text-orange-900 dark:border-orange-900/40 dark:bg-orange-950/30 dark:text-orange-100" />
                        <StatCard label="Admin Granted" value={data?.stats?.adminGranted || 0} icon={<ShieldCheck size={20} className="text-indigo-500" />} color="border-indigo-200 bg-indigo-50/60 text-indigo-900 dark:border-indigo-900/40 dark:bg-indigo-950/30 dark:text-indigo-100" />
                        <StatCard label="Paid Subs" value={data?.stats?.paidSubs || 0} icon={<CreditCard size={20} className="text-emerald-500" />} color="border-emerald-200 bg-emerald-50/60 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100" />
                    </div>

                    {/* Expiry Alert */}
                    {(data?.stats?.expiringSoon || 0) > 0 && (
                        <div className="flex items-center gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-900/40 dark:bg-orange-950/30">
                            <AlertTriangle size={18} className="text-orange-500 shrink-0" />
                            <p className="text-sm font-semibold text-orange-800 dark:text-orange-200">
                                {data.stats.expiringSoon} subscription(s) expiring within 7 days. Visit User Management to extend them.
                            </p>
                        </div>
                    )}

                    {/* Tab Navigation */}
                    <div className="flex border-b border-stone-200 dark:border-slate-800">
                        {tabs.map(t => (
                            <button key={t.key} onClick={() => setTab(t.key)}
                                className={`inline-flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${tab === t.key ? "border-amber-500 text-amber-600 dark:text-amber-400" : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400"}`}>
                                {t.icon} {t.label} {t.items.length > 0 && <span className="rounded-full bg-stone-100 px-1.5 text-xs dark:bg-slate-800">{t.items.length}</span>}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    {tabs.map(t => t.key === tab && (
                        <SubTable key={t.key} items={t.items} title={t.label} columns={subCols}
                            emptyMsg={`No ${t.label.toLowerCase()} subscriptions found.`} />
                    ))}
                </>
            )}
        </div>
    );
}
