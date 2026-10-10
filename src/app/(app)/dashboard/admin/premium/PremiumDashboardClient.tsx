"use client";

import { useEffect, useState, useMemo } from "react";
import { apiFetch } from "@/lib/api";
import { PageHeader, Badge, Pagination } from "@/components/dashboard/ui";
import { 
    Crown, RefreshCw, Loader2, AlertTriangle, XCircle, Clock, 
    CreditCard, DollarSign, TrendingUp, Receipt, Search, Plus, 
    Calendar, CheckCircle2, User, Phone, Mail, ExternalLink, X, Send, Eye
} from "lucide-react";
import { toast } from "sonner";

function StatCard({ label, value, icon, color, subtitle }: { label: string; value: string | number; icon: React.ReactNode; color: string; subtitle?: string }) {
    return (
        <div className={`rounded-2xl border p-5 shadow-sm transition-all duration-200 ${color}`}>
            <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider opacity-75">{label}</p>
                {icon}
            </div>
            <p className="mt-2 text-3xl font-black">{value}</p>
            {subtitle && <p className="mt-1 text-[11px] font-medium opacity-80">{subtitle}</p>}
        </div>
    );
}

export default function PremiumDashboardClient() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [tab, setTab] = useState<"ACTIVE" | "EXPIRING" | "EXPIRED" | "CANCELLED" | "PAYMENTS">("ACTIVE");

    // Search and Filter States
    const [searchQuery, setSearchQuery] = useState("");
    const [providerFilter, setProviderFilter] = useState("ALL");
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    // Grant Modal States
    const [grantModalOpen, setGrantModalOpen] = useState(false);
    const [grantSeekerId, setGrantSeekerId] = useState("");
    const [grantUserId, setGrantUserId] = useState("");
    const [grantMonths, setGrantMonths] = useState(1);
    const [submittingGrant, setSubmittingGrant] = useState(false);
    
    // Quick User Search for Grant Modal
    const [userSearchQuery, setUserSearchQuery] = useState("");
    const [searchingUsers, setSearchingUsers] = useState(false);
    const [userSearchResults, setUserSearchResults] = useState<any[]>([]);

    // User Inspection Modal States
    const [inspectUser, setInspectUser] = useState<any>(null);
    const [inspectData, setInspectData] = useState<any>(null);
    const [loadingInspect, setLoadingInspect] = useState(false);

    // Action execution state
    const [actioningId, setActioningId] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await apiFetch("/api/admin/premium");
            if (res.ok) setData(await res.json());
            else toast.error("Failed to load premium data");
        } catch { 
            toast.error("Network error"); 
        } finally { 
            setLoading(false); 
        }
    };

    useEffect(() => { fetchData(); }, []);

    // Reset page on tab, search or filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [tab, searchQuery, providerFilter]);

    // Handle user search in Grant Modal
    useEffect(() => {
        if (!userSearchQuery.trim() || userSearchQuery.length < 2) {
            setUserSearchResults([]);
            return;
        }
        const timer = setTimeout(async () => {
            setSearchingUsers(true);
            try {
                const res = await apiFetch(`/api/admin/users?search=${encodeURIComponent(userSearchQuery)}&limit=5`);
                if (res.ok) {
                    const resData = await res.json();
                    setUserSearchResults(resData.users || []);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setSearchingUsers(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [userSearchQuery]);

    const handleGrantPremium = async () => {
        if (!grantUserId && !grantSeekerId) {
            toast.error("Please select a candidate or enter a User/Seeker ID");
            return;
        }
        setSubmittingGrant(true);
        try {
            const res = await apiFetch("/api/admin/subscriptions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: grantUserId,
                    seekerId: grantSeekerId,
                    action: "GRANT",
                    durationMonths: grantMonths
                })
            });
            const resData = await res.json();
            if (res.ok && resData.success) {
                toast.success(resData.message || "Premium granted successfully!");
                setGrantModalOpen(false);
                setGrantSeekerId("");
                setGrantUserId("");
                setUserSearchQuery("");
                fetchData();
            } else {
                toast.error(resData.error || "Failed to grant premium");
            }
        } catch {
            toast.error("Error connecting to server");
        } finally {
            setSubmittingGrant(false);
        }
    };

    const handleRevokePremium = async (userId: string, seekerId?: string) => {
        if (!confirm("Are you sure you want to revoke this candidate's Premium subscription?")) return;
        setActioningId(seekerId || userId);
        try {
            const res = await apiFetch("/api/admin/subscriptions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: userId || seekerId,
                    seekerId,
                    action: "REVOKE"
                })
            });
            const resData = await res.json();
            if (res.ok && resData.success) {
                toast.success("Premium subscription revoked");
                fetchData();
            } else {
                toast.error(resData.error || "Failed to revoke subscription");
            }
        } catch {
            toast.error("Network error");
        } finally {
            setActioningId(null);
        }
    };

    const handleQuickExtend = async (s: any, months: number = 1) => {
        const seekerObj = seeker(s);
        const userId = seekerObj?.user_id || s.seeker_id;
        setActioningId(s.id);
        try {
            const res = await apiFetch("/api/admin/subscriptions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId,
                    seekerId: s.seeker_id,
                    action: "GRANT",
                    durationMonths: months
                })
            });
            const resData = await res.json();
            if (res.ok && resData.success) {
                toast.success(`Subscription extended by ${months} month(s)!`);
                fetchData();
            } else {
                toast.error(resData.error || "Failed to extend subscription");
            }
        } catch {
            toast.error("Network error");
        } finally {
            setActioningId(null);
        }
    };

    const handleSendReminder = async (s: any) => {
        const seekerObj = seeker(s);
        const userId = seekerObj?.user_id || s.seeker_id;
        if (!userId) {
            toast.error("User details missing for notification.");
            return;
        }
        setActioningId(s.id);
        toast.loading("Sending renewal reminder notification...");
        try {
            const res = await apiFetch("/api/admin/users/actions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "SEND_MATCH_NOTIFICATIONS",
                    userId,
                    seekerId: s.seeker_id
                })
            });
            const resData = await res.json();
            toast.dismiss();
            if (res.ok && resData.success) {
                toast.success("Renewal reminder & matches sent successfully!");
            } else {
                toast.error(resData.error || "Failed to send notification");
            }
        } catch {
            toast.dismiss();
            toast.error("Network error while sending notification");
        } finally {
            setActioningId(null);
        }
    };

    const handleInspectUser = async (userId: string, seekerId?: string) => {
        setInspectUser({ id: userId, seekerId });
        setLoadingInspect(true);
        setInspectData(null);
        try {
            const params = new URLSearchParams();
            params.set("userId", userId);
            if (seekerId) params.set("seekerId", seekerId);

            const res = await apiFetch(`/api/admin/users/inspect?${params.toString()}`);
            if (res.ok) {
                setInspectData(await res.json());
            } else {
                toast.error("Failed to fetch user inspection details");
            }
        } catch {
            toast.error("Network error loading user details");
        } finally {
            setLoadingInspect(false);
        }
    };

    const seeker = (s: any) => Array.isArray(s.job_seekers) ? s.job_seekers[0] : s.job_seekers;

    // Selected raw tab items
    const rawItems = useMemo(() => {
        if (!data) return [];
        if (tab === "ACTIVE") return data.active || [];
        if (tab === "EXPIRING") return data.expiringSoon || [];
        if (tab === "EXPIRED") return data.expired || [];
        if (tab === "CANCELLED") return data.cancelled || [];
        if (tab === "PAYMENTS") return data.recentTransactions || [];
        return [];
    }, [data, tab]);

    // Filtered Items
    const filteredItems = useMemo(() => {
        return rawItems.filter((item: any) => {
            const query = searchQuery.toLowerCase().trim();
            
            if (tab === "PAYMENTS") {
                const ref = (item.provider_reference || item.id || "").toLowerCase();
                const seekerName = (item.seeker?.full_name || "").toLowerCase();
                const phone = (item.seeker?.phone || "").toLowerCase();
                const matchesQuery = !query || ref.includes(query) || seekerName.includes(query) || phone.includes(query);
                return matchesQuery;
            }

            const sk = seeker(item);
            const name = (sk?.full_name || "").toLowerCase();
            const phone = (sk?.phone || "").toLowerCase();
            const ref = (item.payment_reference || "").toLowerCase();
            const matchesQuery = !query || name.includes(query) || phone.includes(query) || ref.includes(query);

            const provider = item.payment_provider || "PayChangu";
            const matchesProvider = providerFilter === "ALL" || 
                (providerFilter === "ADMIN_MANUAL" ? provider === "ADMIN_MANUAL" : provider !== "ADMIN_MANUAL");

            return matchesQuery && matchesProvider;
        });
    }, [rawItems, searchQuery, providerFilter, tab]);

    // Paginated Items
    const paginatedItems = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredItems.slice(start, start + pageSize);
    }, [filteredItems, currentPage, pageSize]);

    const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;

    const tabs = [
        { key: "ACTIVE", label: "Active", icon: <Crown size={14} />, count: data?.stats?.totalActive || 0 },
        { key: "EXPIRING", label: "Expiring Soon", icon: <Clock size={14} />, count: data?.stats?.expiringSoon || 0 },
        { key: "EXPIRED", label: "Expired", icon: <AlertTriangle size={14} />, count: data?.stats?.expired || 0 },
        { key: "CANCELLED", label: "Cancelled", icon: <XCircle size={14} />, count: data?.stats?.cancelled || 0 },
        { key: "PAYMENTS", label: "Payment Ledger", icon: <Receipt size={14} />, count: data?.recentTransactions?.length || 0 }
    ] as const;

    const formattedRevenue = `MWK ${(data?.stats?.totalGrossRevenue || 0).toLocaleString()}`;
    const formattedMRR = `MWK ${(data?.stats?.mrr || 0).toLocaleString()}/mo`;

    return (
        <div className="space-y-6 pb-20">
            {/* Header with Grant Action */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <PageHeader title="Subscriptions & Revenue Insights" subtitle="Track real-time revenues, manage subscriber lifecycles, and grant premium access." />
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setGrantModalOpen(true)}
                        className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-amber-600 transition"
                    >
                        <Plus size={16} /> Grant Premium
                    </button>
                    <button onClick={fetchData} className="rounded-xl border border-stone-200 p-2.5 text-slate-500 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 transition">
                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {loading && !data ? (
                <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-amber-500" size={28} /></div>
            ) : (
                <>
                    {/* Financial Highlights */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard 
                            label="Total Gross Revenue" 
                            value={formattedRevenue} 
                            subtitle="All-time cumulative payments received"
                            icon={<DollarSign size={22} className="text-emerald-500" />} 
                            color="border-emerald-200 bg-emerald-50/70 text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100" 
                        />
                        <StatCard 
                            label="Est. Monthly Rec. Revenue (MRR)" 
                            value={formattedMRR} 
                            subtitle="Based on MWK 1,000 / month active subs"
                            icon={<TrendingUp size={22} className="text-sky-500" />} 
                            color="border-sky-200 bg-sky-50/70 text-sky-950 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-100" 
                        />
                        <StatCard 
                            label="Active Premium Seekers" 
                            value={data?.stats?.totalActive || 0} 
                            subtitle={`${data?.stats?.paidSubs || 0} paid via gateway · ${data?.stats?.adminGranted || 0} admin grants`}
                            icon={<Crown size={22} className="text-amber-500" />} 
                            color="border-amber-200 bg-amber-50/70 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100" 
                        />
                        <StatCard 
                            label="PayChangu Paid Volume" 
                            value={data?.stats?.paidSubs || 0} 
                            subtitle="Direct automated mobile money transactions"
                            icon={<CreditCard size={22} className="text-indigo-500" />} 
                            color="border-indigo-200 bg-indigo-50/70 text-indigo-950 dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-indigo-100" 
                        />
                    </div>

                    {/* Expiry Alert Banner */}
                    {(data?.stats?.expiringSoon || 0) > 0 && (
                        <div className="flex items-center justify-between rounded-2xl border border-orange-200 bg-orange-50/90 p-4 dark:border-orange-900/40 dark:bg-orange-950/30">
                            <div className="flex items-center gap-3">
                                <AlertTriangle size={18} className="text-orange-500 shrink-0" />
                                <p className="text-sm font-semibold text-orange-800 dark:text-orange-200">
                                    {data.stats.expiringSoon} premium subscription(s) expiring within 7 days.
                                </p>
                            </div>
                            <button 
                                onClick={() => setTab("EXPIRING")}
                                className="text-xs font-bold text-orange-700 underline hover:text-orange-900 dark:text-orange-300 dark:hover:text-white"
                            >
                                View Expiring List
                            </button>
                        </div>
                    )}

                    {/* Tab Navigation */}
                    <div className="flex border-b border-stone-200 dark:border-slate-800 overflow-x-auto">
                        {tabs.map(t => (
                            <button key={t.key} onClick={() => setTab(t.key)}
                                className={`inline-flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors ${tab === t.key ? "border-amber-500 text-amber-600 dark:text-amber-400" : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400"}`}>
                                {t.icon} {t.label} {t.count > 0 && <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">{t.count}</span>}
                            </button>
                        ))}
                    </div>

                    {/* Search & Provider Filter Controls */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="relative flex-1 max-w-md">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text"
                                placeholder={tab === "PAYMENTS" ? "Search transaction ID or seeker..." : "Search name, phone, reference..."}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full rounded-xl border border-stone-200 bg-white pl-9 pr-4 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                        </div>

                        {tab !== "PAYMENTS" && (
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-slate-400">Provider:</span>
                                <select
                                    value={providerFilter}
                                    onChange={(e) => setProviderFilter(e.target.value)}
                                    className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                >
                                    <option value="ALL">All Providers</option>
                                    <option value="PAYCHANGU">PayChangu Automated</option>
                                    <option value="ADMIN_MANUAL">Admin Manual Grant</option>
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Table View */}
                    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm">
                        {paginatedItems.length === 0 ? (
                            <div className="p-8 text-center">
                                <p className="font-semibold text-slate-900 dark:text-white">No records found</p>
                                <p className="mt-1 text-xs text-slate-400">Try refining your search query or provider filter.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-stone-50 border-b border-stone-200 text-slate-500 dark:bg-slate-800/50 dark:border-slate-800 dark:text-slate-400 uppercase tracking-wider font-semibold">
                                        {tab === "PAYMENTS" ? (
                                            <tr>
                                                <th className="px-5 py-3">Transaction Ref</th>
                                                <th className="px-5 py-3">Seeker Profile</th>
                                                <th className="px-5 py-3">Amount Paid</th>
                                                <th className="px-5 py-3">Status</th>
                                                <th className="px-5 py-3 text-right">Actions</th>
                                            </tr>
                                        ) : (
                                            <tr>
                                                <th className="px-5 py-3">Seeker</th>
                                                <th className="px-5 py-3">Plan Ends</th>
                                                <th className="px-5 py-3">Provider</th>
                                                <th className="px-5 py-3">Status</th>
                                                <th className="px-5 py-3 text-right">Actions</th>
                                            </tr>
                                        )}
                                    </thead>
                                    <tbody className="divide-y divide-stone-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                                        {tab === "PAYMENTS" ? (
                                            paginatedItems.map((p: any) => (
                                                <tr key={p.id} className="hover:bg-stone-50/50 dark:hover:bg-slate-800/30 transition">
                                                    <td className="px-5 py-3.5">
                                                        <p className="font-mono font-semibold text-slate-900 dark:text-white">{p.provider_reference || p.id.slice(0, 8)}</p>
                                                        <p className="text-[10px] text-slate-400">{new Date(p.created_at).toLocaleString()}</p>
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <p className="font-semibold text-slate-900 dark:text-white">{p.seeker?.full_name || "Premium Member"}</p>
                                                        <p className="text-[11px] text-slate-400">{p.seeker?.phone || "MWK Standard Plan"}</p>
                                                    </td>
                                                    <td className="px-5 py-3.5 font-bold text-emerald-600 dark:text-emerald-400">
                                                        {p.currency || "MWK"} {Number(p.amount || 1000).toLocaleString()}
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <Badge label={p.status || "PAID"} variant={p.status === "PAID" ? "green" : "outline"} />
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right">
                                                        {p.seeker?.user_id && (
                                                            <button 
                                                                onClick={() => handleInspectUser(p.seeker.user_id, p.seeker.id)}
                                                                className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1 text-[11px] font-semibold hover:bg-stone-100 dark:border-slate-700 dark:hover:bg-slate-800 transition"
                                                            >
                                                                <Eye size={12} /> Inspect
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            paginatedItems.map((s: any) => {
                                                const sk = seeker(s);
                                                const userId = sk?.user_id || s.seeker_id;
                                                const isActioning = actioningId === s.id;
                                                return (
                                                    <tr key={s.id} className="hover:bg-stone-50/50 dark:hover:bg-slate-800/30 transition">
                                                        <td className="px-5 py-3.5">
                                                            <div className="flex items-center gap-2">
                                                                <div>
                                                                    <p className="font-semibold text-slate-900 dark:text-white">{sk?.full_name || "—"}</p>
                                                                    <p className="text-[11px] text-slate-400">{sk?.phone || "No phone"}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-3.5">
                                                            <p className="font-medium text-slate-700 dark:text-slate-300">{new Date(s.ends_at).toLocaleDateString()}</p>
                                                            <p className="text-[10px] text-slate-400">
                                                                {new Date(s.ends_at) > new Date() 
                                                                    ? `${Math.ceil((new Date(s.ends_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} day(s) left` 
                                                                    : "Expired"}
                                                            </p>
                                                        </td>
                                                        <td className="px-5 py-3.5">
                                                            <Badge 
                                                                label={s.payment_provider === "ADMIN_MANUAL" ? "Admin Grant" : (s.payment_provider || "PayChangu")} 
                                                                variant={s.payment_provider === "ADMIN_MANUAL" ? "yellow" : "blue"} 
                                                            />
                                                        </td>
                                                        <td className="px-5 py-3.5">
                                                            {(() => {
                                                                const isPast = new Date(s.ends_at) <= new Date();
                                                                const daysLeft = Math.ceil((new Date(s.ends_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                                                                const isExpiringSoon = !isPast && s.status === "ACTIVE" && daysLeft <= 7;

                                                                if (s.status === "CANCELLED") {
                                                                    return <span className="rounded-full bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 px-2.5 py-0.5 text-[11px] font-bold">CANCELLED</span>;
                                                                }
                                                                if (isPast) {
                                                                    return <span className="rounded-full bg-stone-100 text-stone-600 dark:bg-slate-800 dark:text-slate-400 px-2.5 py-0.5 text-[11px] font-bold">EXPIRED</span>;
                                                                }
                                                                if (isExpiringSoon) {
                                                                    return <span className="rounded-full bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 px-2.5 py-0.5 text-[11px] font-bold">EXPIRING SOON</span>;
                                                                }
                                                                return <span className="rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2.5 py-0.5 text-[11px] font-bold">ACTIVE</span>;
                                                            })()}
                                                        </td>
                                                        <td className="px-5 py-3.5 text-right">
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                {userId && (
                                                                    <button 
                                                                        onClick={() => handleInspectUser(userId, s.seeker_id)}
                                                                        className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-2 py-1 text-[11px] font-semibold hover:bg-stone-100 dark:border-slate-700 dark:hover:bg-slate-800 transition"
                                                                        title="Inspect Seeker Profile"
                                                                    >
                                                                        <Eye size={12} /> Inspect
                                                                    </button>
                                                                )}
                                                                {tab === "EXPIRING" && (
                                                                    <button 
                                                                        onClick={() => handleSendReminder(s)}
                                                                        disabled={isActioning}
                                                                        className="inline-flex items-center gap-1 rounded-lg bg-orange-100 text-orange-800 px-2 py-1 text-[11px] font-semibold hover:bg-orange-200 dark:bg-orange-950 dark:text-orange-300 transition"
                                                                        title="Send Renewal WhatsApp Notification"
                                                                    >
                                                                        <Send size={12} /> Remind
                                                                    </button>
                                                                )}
                                                                <button 
                                                                    onClick={() => handleQuickExtend(s, 1)}
                                                                    disabled={isActioning}
                                                                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 text-[11px] font-semibold hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800 transition"
                                                                    title="Extend plan by 1 month"
                                                                >
                                                                    +1M
                                                                </button>
                                                                {s.status === "ACTIVE" && (
                                                                    <button 
                                                                        onClick={() => handleRevokePremium(userId, s.seeker_id)}
                                                                        disabled={isActioning}
                                                                        className="inline-flex items-center gap-1 rounded-lg bg-red-50 text-red-600 border border-red-200 px-2 py-1 text-[11px] font-semibold hover:bg-red-100 dark:bg-red-950/50 dark:text-red-400 dark:border-red-900 transition"
                                                                        title="Revoke Premium"
                                                                    >
                                                                        Revoke
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Pagination Footer */}
                        {filteredItems.length > pageSize && (
                            <div className="border-t border-stone-100 px-5 py-3 dark:border-slate-800">
                                <Pagination 
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    onPageChange={(p) => setCurrentPage(p)}
                                />
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Modal: Grant Premium Access */}
            {grantModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-stone-200 dark:border-slate-800 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Crown size={20} className="text-amber-500" />
                                <h3 className="font-bold text-slate-900 dark:text-white">Grant Premium Access</h3>
                            </div>
                            <button onClick={() => setGrantModalOpen(false)} className="rounded-lg p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                                <X size={18} />
                            </button>
                        </div>

                        {/* User Search Input */}
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Select Candidate</label>
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input 
                                    type="text"
                                    placeholder="Search by candidate name or email..."
                                    value={userSearchQuery}
                                    onChange={(e) => setUserSearchQuery(e.target.value)}
                                    className="w-full rounded-xl border border-stone-200 bg-stone-50 pl-8 pr-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />
                                {searchingUsers && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-amber-500" />}
                            </div>

                            {/* Search Results Dropdown */}
                            {userSearchResults.length > 0 && (
                                <div className="max-h-36 overflow-y-auto rounded-xl border border-stone-200 bg-white p-1 shadow-md dark:border-slate-700 dark:bg-slate-800 divide-y divide-stone-100 dark:divide-slate-700">
                                    {userSearchResults.map((u: any) => (
                                        <button
                                            key={u.id}
                                            onClick={() => {
                                                setGrantUserId(u.id);
                                                setGrantSeekerId(u.seekerId || "");
                                                setUserSearchQuery(u.name || u.email);
                                                setUserSearchResults([]);
                                            }}
                                            className="w-full text-left px-3 py-2 text-xs hover:bg-amber-50 dark:hover:bg-slate-700 flex justify-between items-center"
                                        >
                                            <div>
                                                <p className="font-semibold text-slate-900 dark:text-white">{u.name || "Unnamed Seeker"}</p>
                                                <p className="text-[10px] text-slate-400">{u.email}</p>
                                            </div>
                                            {u.plan === "PREMIUM" && <Badge label="PREMIUM" variant="yellow" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Direct User ID Override */}
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-500">User ID (UUID)</label>
                                <input 
                                    type="text"
                                    placeholder="User UUID"
                                    value={grantUserId}
                                    onChange={(e) => setGrantUserId(e.target.value)}
                                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-mono text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-500">Seeker ID (Optional)</label>
                                <input 
                                    type="text"
                                    placeholder="Seeker UUID"
                                    value={grantSeekerId}
                                    onChange={(e) => setGrantSeekerId(e.target.value)}
                                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-mono text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                />
                            </div>
                        </div>

                        {/* Duration Selection */}
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Subscription Duration</label>
                            <select 
                                value={grantMonths} 
                                onChange={(e) => setGrantMonths(Number(e.target.value))}
                                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                            >
                                <option value={1}>1 Month (Standard)</option>
                                <option value={3}>3 Months (Quarterly)</option>
                                <option value={6}>6 Months (Half Year)</option>
                                <option value={12}>12 Months (Full Year)</option>
                            </select>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 dark:border-slate-800">
                            <button 
                                onClick={() => setGrantModalOpen(false)}
                                className="rounded-xl border border-stone-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-stone-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleGrantPremium}
                                disabled={submittingGrant || (!grantUserId && !grantSeekerId)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white hover:bg-amber-600 disabled:opacity-50"
                            >
                                {submittingGrant ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Confirm Grant
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: User Details & Telemetry Inspection */}
            {inspectUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-stone-200 dark:border-slate-800 space-y-5">
                        <div className="flex items-center justify-between border-b border-stone-100 pb-3 dark:border-slate-800">
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <User size={18} className="text-amber-500" /> Candidate Inspection Profile
                                </h3>
                                <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {inspectUser.id}</p>
                            </div>
                            <button onClick={() => setInspectUser(null)} className="rounded-lg p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                                <X size={18} />
                            </button>
                        </div>

                        {loadingInspect || !inspectData ? (
                            <div className="flex h-48 items-center justify-center"><Loader2 className="animate-spin text-amber-500" size={24} /></div>
                        ) : (
                            <div className="space-y-4 text-xs">
                                {/* Seeker Details */}
                                <div className="rounded-xl bg-stone-50 p-4 dark:bg-slate-800/50 space-y-2">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-slate-400 font-medium">Full Name</p>
                                            <p className="font-bold text-slate-900 dark:text-white text-sm">{inspectData.seekerProfile?.full_name || inspectData.user?.name || "N/A"}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-400 font-medium">Email Address</p>
                                            <p className="font-bold text-slate-900 dark:text-white">{inspectData.user?.email || "N/A"}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-400 font-medium">Phone Number</p>
                                            <p className="font-semibold text-slate-900 dark:text-white">{inspectData.seekerProfile?.phone || "N/A"}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-400 font-medium">Highest Qualification</p>
                                            <p className="font-semibold text-slate-900 dark:text-white">{inspectData.seekerProfile?.qualification || "Not specified"}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Active Matches Telemetry */}
                                <div className="space-y-2">
                                    <p className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                                        <span>Top AI Job Matches ({inspectData.matches?.length || 0})</span>
                                    </p>
                                    {inspectData.matches?.length === 0 ? (
                                        <p className="text-slate-400 italic">No active match scores calculated.</p>
                                    ) : (
                                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                            {inspectData.matches?.map((m: any) => (
                                                <div key={m.id} className="rounded-xl border border-stone-200 p-3 dark:border-slate-800 flex items-center justify-between">
                                                    <div>
                                                        <p className="font-bold text-slate-900 dark:text-white">{m.title}</p>
                                                        <p className="text-[11px] text-slate-400">{m.company} · {m.location}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2.5 py-0.5 font-bold text-xs">
                                                            {m.match_score}% Match
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Applications History */}
                                <div className="space-y-2">
                                    <p className="font-bold text-slate-900 dark:text-white">Recent Applications ({inspectData.applications?.length || 0})</p>
                                    {inspectData.applications?.length === 0 ? (
                                        <p className="text-slate-400 italic">No job applications submitted yet.</p>
                                    ) : (
                                        <div className="space-y-1.5 max-h-36 overflow-y-auto">
                                            {inspectData.applications?.map((app: any) => (
                                                <div key={app.id} className="flex justify-between items-center rounded-lg bg-stone-50 px-3 py-2 dark:bg-slate-800/40">
                                                    <div>
                                                        <p className="font-semibold text-slate-900 dark:text-white">{app.job?.title || "Job Application"}</p>
                                                        <p className="text-[10px] text-slate-400">{new Date(app.created_at).toLocaleDateString()}</p>
                                                    </div>
                                                    <Badge label={app.status || "SUBMITTED"} variant="blue" />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

