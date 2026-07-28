"use client";

import { useEffect, useState, useDeferredValue, useMemo } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase-client";
import { 
    AlertCircle, AlertTriangle, CheckCircle2, Info, 
    Activity, Mail, Users, Briefcase, FileText, 
    Zap, CreditCard, ShieldAlert, Cpu, HeartPulse, Search, Calendar
} from "lucide-react";

type EventCategory = "USER" | "EMPLOYER" | "JOB" | "APPLICATION" | "MATCHING" | "NOTIFICATION" | "AUTOMATION" | "PAYMENT" | "SYSTEM" | "SECURITY";
type EventSeverity = "INFO" | "SUCCESS" | "WARNING" | "CRITICAL";

interface SystemEvent {
    id: string;
    created_at: string;
    category: EventCategory;
    severity: EventSeverity;
    event: string;
    message: string;
    actor_id?: string;
    correlation_id?: string;
    metadata: Record<string, any>;
    actor?: { email: string };
}

const CATEGORY_ICONS: Record<EventCategory, React.ElementType> = {
    USER: Users,
    EMPLOYER: Briefcase,
    JOB: FileText,
    APPLICATION: FileText,
    MATCHING: Zap,
    NOTIFICATION: Mail,
    AUTOMATION: Cpu,
    PAYMENT: CreditCard,
    SYSTEM: Activity,
    SECURITY: ShieldAlert,
};

const SEVERITY_COLORS: Record<EventSeverity, string> = {
    INFO: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
    SUCCESS: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
    WARNING: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
    CRITICAL: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800",
};

const SEVERITY_ICONS: Record<EventSeverity, React.ElementType> = {
    INFO: Info,
    SUCCESS: CheckCircle2,
    WARNING: AlertTriangle,
    CRITICAL: AlertCircle,
};

function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ", " + 
           d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function MissionControlClient({ initialEvents }: { initialEvents: SystemEvent[] }) {
    const [events, setEvents] = useState<SystemEvent[]>(initialEvents);
    const [filterCategory, setFilterCategory] = useState<EventCategory | "ALL">("ALL");
    const [filterSeverity, setFilterSeverity] = useState<EventSeverity | "ALL">("ALL");
    const [searchQuery, setSearchQuery] = useState("");
    const deferredSearchQuery = useDeferredValue(searchQuery);
    const [filterDays, setFilterDays] = useState<number | "ALL">(7);
    useEffect(() => {
        const supabase = createBrowserSupabaseClient();
        const channelId = `system_events_${Math.random().toString(36).substring(2, 9)}`;
        const channel = supabase
            .channel(channelId)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'system_events',
                },
                (payload: any) => {
                    const newEvent = payload.new as SystemEvent;
                    setEvents((prev) => [newEvent, ...prev].slice(0, 200)); // Keep max 200 in memory
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const filteredEvents = useMemo(() => {
        return events.filter(e => {
            if (filterCategory !== "ALL" && e.category !== filterCategory) return false;
            if (filterSeverity !== "ALL" && e.severity !== filterSeverity) return false;
            if (deferredSearchQuery) {
                const query = deferredSearchQuery.toLowerCase();
                const eventMatch = e.event?.toLowerCase().includes(query);
                const messageMatch = e.message?.toLowerCase().includes(query);
                const correlationMatch = e.correlation_id?.toLowerCase().includes(query);
                const metadataMatch = e.metadata ? JSON.stringify(e.metadata).toLowerCase().includes(query) : false;
                
                if (!eventMatch && !messageMatch && !correlationMatch && !metadataMatch) {
                    return false;
                }
            }
            if (filterDays !== "ALL") {
                const date = new Date(e.created_at);
                const cutoff = new Date();
                cutoff.setDate(cutoff.getDate() - filterDays);
                if (date < cutoff) return false;
            }
            return true;
        });
    }, [events, filterCategory, filterSeverity, deferredSearchQuery, filterDays]);

    const criticalCount = events.filter(e => e.severity === "CRITICAL").length;
    const warningCount = events.filter(e => e.severity === "WARNING").length;
    const isHealthy = criticalCount === 0;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${isHealthy ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/30'}`}>
                        <HeartPulse size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-medium">System Health</p>
                        <p className="text-xl font-bold text-slate-900 dark:text-white">{isHealthy ? 'Optimal' : 'Degraded'}</p>
                    </div>
                </div>
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30">
                        <Activity size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-medium">Events Recorded</p>
                        <p className="text-xl font-bold text-slate-900 dark:text-white">{events.length}</p>
                    </div>
                </div>
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-900/30">
                        <AlertCircle size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-medium">Critical Errors</p>
                        <p className="text-xl font-bold text-slate-900 dark:text-white">{criticalCount}</p>
                    </div>
                </div>
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/30">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-medium">Warnings</p>
                        <p className="text-xl font-bold text-slate-900 dark:text-white">{warningCount}</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap gap-4 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Search</label>
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text"
                            placeholder="Search events..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700"
                        />
                    </div>
                </div>
                <div className="w-full sm:w-auto">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Time Range</label>
                    <div className="relative">
                        <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <select 
                            value={filterDays}
                            onChange={(e) => setFilterDays(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
                            className="w-full sm:w-32 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700 appearance-none"
                        >
                            <option value={1}>Today</option>
                            <option value={7}>Last 7 Days</option>
                            <option value={30}>Last 30 Days</option>
                            <option value="ALL">All Time</option>
                        </select>
                    </div>
                </div>
                <div className="w-full sm:w-auto">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Category</label>
                    <select 
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value as any)}
                        className="w-full sm:w-40 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700"
                    >
                        <option value="ALL">All Categories</option>
                        {Object.keys(CATEGORY_ICONS).map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>
                <div className="w-full sm:w-auto">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Severity</label>
                    <select 
                        value={filterSeverity}
                        onChange={(e) => setFilterSeverity(e.target.value as any)}
                        className="w-full sm:w-40 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700"
                    >
                        <option value="ALL">All Severities</option>
                        {Object.keys(SEVERITY_COLORS).map(sev => (
                            <option key={sev} value={sev}>{sev}</option>
                        ))}
                    </select>
                </div>
                <div className="flex items-end pb-1">
                    <div className="text-xs text-slate-500">
                        Showing {filteredEvents.length} events
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                {filteredEvents.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">
                        No events found matching your filters.
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredEvents.map(event => {
                            const CatIcon = CATEGORY_ICONS[event.category] || Activity;
                            const SevIcon = SEVERITY_ICONS[event.severity] || Info;
                            const colorClass = SEVERITY_COLORS[event.severity] || SEVERITY_COLORS.INFO;

                            return (
                                <div key={event.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex gap-4 items-start">
                                    <div className={`p-2 rounded-xl border shrink-0 ${colorClass}`}>
                                        <SevIcon size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                                                <CatIcon size={12} />
                                                {event.category}
                                            </span>
                                            <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                                {event.event}
                                            </span>
                                            <span className="text-xs text-slate-400 ml-auto whitespace-nowrap">
                                                {formatDate(event.created_at)}
                                            </span>
                                        </div>
                                        {event.correlation_id && (
                                            <div className="mb-2 flex items-center gap-2 text-xs">
                                                <span className="font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">
                                                    ID: {event.correlation_id.substring(0, 8)}
                                                </span>
                                            </div>
                                        )}

                                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                                            {event.message}
                                        </p>
                                        
                                        {/* Metadata Viewer */}
                                        {Object.keys(event.metadata || {}).length > 0 && (
                                            <div className="mt-2 text-xs bg-slate-50 dark:bg-slate-950 p-2 rounded-lg border border-slate-200 dark:border-slate-800 overflow-x-auto">
                                                <pre className="text-slate-500 dark:text-slate-400 font-mono">
                                                    {JSON.stringify(event.metadata, null, 2)}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
