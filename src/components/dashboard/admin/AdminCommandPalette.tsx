"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Search, Command, LayoutDashboard, Zap, Briefcase,
    Users, Mail, ShieldCheck, Crown, BarChart3,
    ClipboardList, Sparkles, BrainCircuit, Activity, X
} from "lucide-react";

interface CommandItem {
    id: string;
    title: string;
    description: string;
    href: string;
    category: string;
    icon: any;
}

const commands: CommandItem[] = [
    { id: "overview", title: "Metrics Overview", description: "View marketplace telemetry and core metrics", href: "/dashboard/admin", category: "Command Center", icon: LayoutDashboard },
    { id: "ingestion", title: "Job Ingestion Queue", description: "Review and verify incoming web-crawled jobs", href: "/dashboard/admin/ingestion", category: "Command Center", icon: Zap },
    { id: "jobs", title: "Market Moderation", description: "Manage published jobs and moderation status", href: "/dashboard/admin/jobs", category: "Command Center", icon: Briefcase },
    { id: "users", title: "User Management", description: "Oversee job seekers, employers, and account requests", href: "/dashboard/admin/users", category: "Command Center", icon: Users },
    { id: "communications", title: "Communications & Broadcasts", description: "Send bulk emails and push notifications", href: "/dashboard/admin/communications", category: "Command Center", icon: Mail },
    { id: "match-approvals", title: "Match Approvals", description: "Human-in-the-loop review for AI match notifications", href: "/dashboard/admin/notifications", category: "Command Center", icon: ShieldCheck },

    { id: "subscriptions", title: "Subscriptions & Billings", description: "Manage seeker & employer premium tiers", href: "/dashboard/admin/premium", category: "Premium", icon: Crown },
    { id: "analytics", title: "Analytics Insights", description: "Deep dive into funnel metrics and conversion rates", href: "/dashboard/admin/premium-hub", category: "Premium", icon: BarChart3 },

    { id: "employers", title: "Employer Verification", description: "Review company documentation and badges", href: "/dashboard/admin/employers", category: "Platform", icon: Users },
    { id: "crm", title: "Employer CRM", description: "Lead tracking and employer relations management", href: "/dashboard/admin/crm", category: "Platform", icon: ClipboardList },
    { id: "opportunities", title: "Opportunities Queue", description: "Manage non-traditional career opportunities", href: "/dashboard/admin/opportunities", category: "Platform", icon: Sparkles },
    { id: "ai-health", title: "AI Health Monitor", description: "Inspect model accuracy, latency, and token usage", href: "/dashboard/admin/ai-health", category: "Platform", icon: BrainCircuit },
    { id: "mission-control", title: "Mission Control Audit", description: "Real-time system events and security audit logs", href: "/dashboard/admin/mission-control", category: "Platform", icon: Activity },
];

export default function AdminCommandPalette() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const router = useRouter();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
            if (e.key === "Escape") {
                setIsOpen(false);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    const filteredCommands = commands.filter(item =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.description.toLowerCase().includes(query.toLowerCase()) ||
        item.category.toLowerCase().includes(query.toLowerCase())
    );

    const handleSelect = (href: string) => {
        setIsOpen(false);
        setQuery("");
        router.push(href);
    };

    const handleKeyDownModal = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % (filteredCommands.length || 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % (filteredCommands.length || 1));
        } else if (e.key === "Enter" && filteredCommands[selectedIndex]) {
            e.preventDefault();
            handleSelect(filteredCommands[selectedIndex].href);
        }
    };

    return (
        <>
            {/* Quick Trigger Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-500 hover:text-slate-900 bg-stone-100 hover:bg-stone-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 dark:text-slate-400 dark:hover:text-white rounded-xl border border-stone-200/80 dark:border-slate-700 transition"
            >
                <Search className="w-3.5 h-3.5" />
                <span className="hidden sm:inline font-medium">Quick Navigate...</span>
                <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold bg-white dark:bg-slate-900 rounded border border-stone-200 dark:border-slate-700">
                    <Command className="w-2.5 h-2.5" /> K
                </kbd>
            </button>

            {/* Modal Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
                    onClick={() => setIsOpen(false)}
                >
                    <div
                        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-slate-800 overflow-hidden flex flex-col"
                        onClick={e => e.stopPropagation()}
                        onKeyDown={handleKeyDownModal}
                    >
                        {/* Search Bar */}
                        <div className="flex items-center px-4 py-3 border-b border-stone-100 dark:border-slate-800">
                            <Search className="w-5 h-5 text-indigo-500 mr-3 shrink-0" />
                            <input
                                autoFocus
                                value={query}
                                onChange={e => {
                                    setQuery(e.target.value);
                                    setSelectedIndex(0);
                                }}
                                placeholder="Search admin features, tools, pages... (Cmd+K)"
                                className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                            />
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1 rounded-lg text-slate-400 hover:bg-stone-100 dark:hover:bg-slate-800"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Command List */}
                        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-stone-100 dark:divide-slate-800/50">
                            {filteredCommands.length === 0 ? (
                                <div className="p-6 text-center text-xs text-slate-400">
                                    No matching admin destinations found.
                                </div>
                            ) : (
                                filteredCommands.map((cmd, idx) => {
                                    const Icon = cmd.icon;
                                    const isSelected = idx === selectedIndex;
                                    return (
                                        <div
                                            key={cmd.id}
                                            onClick={() => handleSelect(cmd.href)}
                                            onMouseEnter={() => setSelectedIndex(idx)}
                                            className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition ${
                                                isSelected
                                                    ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200"
                                                    : "hover:bg-stone-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300"
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${isSelected ? "bg-indigo-500 text-white" : "bg-stone-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}>
                                                    <Icon className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold">{cmd.title}</p>
                                                    <p className="text-[11px] text-slate-400 line-clamp-1">{cmd.description}</p>
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-stone-100 dark:bg-slate-800 text-slate-500">
                                                {cmd.category}
                                            </span>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-4 py-2 bg-stone-50 dark:bg-slate-950 border-t border-stone-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                            <span>Use <kbd className="font-bold">↑</kbd> <kbd className="font-bold">↓</kbd> to navigate, <kbd className="font-bold">Enter</kbd> to select</span>
                            <span>AGANYU Admin Tools</span>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
