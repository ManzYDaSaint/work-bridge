"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Application } from "@/types";
import { motion } from "framer-motion";
import { ChevronRight, Briefcase } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; ringColor: string; bg: string; text: string }> = {
    PENDING: { label: "Applied", ringColor: "border-slate-300", bg: "bg-slate-100", text: "text-slate-600" },
    INVITED: { label: "Shortlisted", ringColor: "border-purple-400", bg: "bg-purple-50", text: "text-purple-700" },
    ACCEPTED: { label: "Interview", ringColor: "border-green-400", bg: "bg-green-50", text: "text-green-700" },
    REJECTED: { label: "Seeing off", ringColor: "border-red-400", bg: "bg-red-50", text: "text-red-600" },
};

export default function ApplicationsPage() {
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchApplications = async () => {
            try {
                const res = await apiFetch("/applications");
                if (res.ok) setApplications(await res.json());
            } finally {
                setLoading(false);
            }
        };
        fetchApplications();
    }, []);

    if (loading) return (
        <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-20 bg-white rounded-2xl border border-slate-200 animate-pulse" />
            ))}
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h2 className="text-xl font-black text-slate-900">Applied Jobs</h2>
                <p className="text-sm text-slate-400 mt-0.5">{applications.length} application{applications.length !== 1 ? "s" : ""} found</p>
            </div>

            {applications.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 py-20 flex flex-col items-center gap-4 text-center px-10">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                        <Briefcase size={28} className="text-slate-400" />
                    </div>
                    <div>
                        <p className="font-bold text-slate-700 text-base">No Applications Yet</p>
                        <p className="text-sm text-slate-400 mt-1 max-w-xs">Start exploring opportunities and apply to positions that match your skills and career goals.</p>
                    </div>
                    <Link href="/dashboard/seeker" className="mt-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors">
                        Browse Jobs
                    </Link>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    {/* Table header */}
                    <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr] px-6 py-3 border-b border-slate-100 bg-slate-50">
                        {["Job Title", "Company", "Date Applied", "Status"].map(h => (
                            <span key={h} className="text-xs font-bold text-slate-400 uppercase tracking-wider">{h}</span>
                        ))}
                    </div>

                    <div className="divide-y divide-slate-100">
                        {applications.map((app, idx) => {
                            const cfg = STATUS_CONFIG[app.status] ?? STATUS_CONFIG.PENDING;
                            return (
                                <motion.div
                                    key={app.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: idx * 0.04 }}
                                    className="grid grid-cols-[2fr_1.5fr_1fr_1fr] px-6 py-4 items-center hover:bg-slate-50 transition-colors"
                                >
                                    {/* Job */}
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-600 text-sm flex-shrink-0">
                                            {app.job?.employer?.companyName?.[0] ?? "?"}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900">{app.job?.title ?? "Unknown"}</p>
                                            <p className="text-xs text-slate-400">{app.job?.location ?? ""} · {app.job?.type ?? ""}</p>
                                        </div>
                                    </div>

                                    {/* Company */}
                                    <p className="text-sm text-slate-600 font-medium">{app.job?.employer?.companyName ?? "—"}</p>

                                    {/* Date */}
                                    <p className="text-sm text-slate-500">
                                        {app.createdAt ? new Date(app.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                                    </p>

                                    {/* Status badge */}
                                    <span className={cn(
                                        "inline-flex self-start px-4 py-1.5 rounded-full border text-xs font-bold",
                                        cfg.ringColor, cfg.bg, cfg.text
                                    )}>
                                        {cfg.label}
                                    </span>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
