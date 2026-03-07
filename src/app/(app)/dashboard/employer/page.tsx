"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Briefcase, Users, Eye, TrendingUp, PlusCircle, ChevronRight, Loader2 } from "lucide-react";
import { PageHeader, StatCard, SectionCard, Badge } from "@/components/dashboard/ui";
import Link from "next/link";
import { motion } from "framer-motion";
import { TalentDiscovery } from "./TalentDiscovery";
import { TalentSearch } from "./TalentSearch";

export default function EmployerOverviewPage() {
    const [stats, setStats] = useState({
        activeJobs: 0,
        totalApplicants: 0,
        profileViews: 124,
        interviewsSet: 12,
    });
    const [loading, setLoading] = useState(true);
    const [isApproved, setIsApproved] = useState(false);
    const [searchResults, setSearchResults] = useState<any[] | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsRes, userRes] = await Promise.all([
                    apiFetch("/api/employer/stats"),
                    apiFetch("/api/me")
                ]);

                if (statsRes.ok) {
                    setStats(await statsRes.json());
                }

                if (userRes.ok) {
                    const userData = await userRes.json();
                    setIsApproved(userData.employer?.status === 'APPROVED');
                }
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const statItems = [
        { label: "Active Job Posts", value: stats.activeJobs, icon: Briefcase, iconBg: "bg-blue-50", iconColor: "text-blue-500" },
        { label: "Total Applicants", value: stats.totalApplicants, icon: Users, iconBg: "bg-green-50", iconColor: "text-green-500" },
        { label: "Profile Views", value: stats.profileViews, icon: Eye, iconBg: "bg-purple-50", iconColor: "text-purple-500" },
        { label: "Interviews Set", value: stats.interviewsSet, icon: TrendingUp, iconBg: "bg-orange-50", iconColor: "text-orange-500" },
    ];

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
    );

    return (
        <div className="space-y-8 pb-20">
            <PageHeader
                title="Workspace Intelligence"
                subtitle="Your corporate acquisition strategy at a glance"
                action={{ label: "Deploy Role", icon: PlusCircle, href: "/dashboard/employer/jobs/new" }}
            />

            {/* Stats grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                {statItems.map((s, idx) => (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        key={s.label}
                    >
                        <StatCard {...s} />
                    </motion.div>
                ))}
            </div>

            {/* Quick links */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[
                    { label: "Manage Talent Grid", href: "/dashboard/employer/jobs", desc: "Orchestrate active job listings and status", icon: Briefcase, color: "text-blue-600 bg-blue-50" },
                    { label: "Pipeline Review", href: "/dashboard/employer/candidates", desc: "Audit and advance incoming applications", icon: Users, color: "text-green-600 bg-green-50" },
                ].map((q, idx) => (
                    <motion.div
                        initial={{ opacity: 0, x: idx === 0 ? -10 : 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        key={q.label}
                    >
                        <Link href={q.href}
                            className="bg-white rounded-[2rem] border border-slate-200 p-8 hover:border-blue-400 hover:shadow-2xl hover:shadow-blue-500/5 transition-all group flex items-center gap-6">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${q.color} shadow-inner`}>
                                <q.icon size={24} />
                            </div>
                            <div className="flex-1">
                                <p className="text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{q.label}</p>
                                <p className="text-xs font-bold text-slate-400 mt-0.5 tracking-tight">{q.desc}</p>
                            </div>
                            <div className="w-10 h-10 rounded-full border border-slate-100 flex items-center justify-center group-hover:bg-blue-600 group-hover:border-blue-600 transition-all">
                                <ChevronRight size={18} className="text-slate-400 group-hover:text-white transition-colors" />
                            </div>
                        </Link>
                    </motion.div>
                ))}
            </div>

            {/* Semantic Search Interface */}
            <TalentSearch onResults={setSearchResults} isApproved={isApproved} />

            {/* Talent Discovery Feed */}
            <TalentDiscovery initialTalent={searchResults || undefined} isApproved={isApproved} />

            {/* Recent activity placeholder */}
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
            >
                <SectionCard title="Command Center Activity">
                    <div className="py-20 flex flex-col items-center gap-4 text-center px-10">
                        <div className="w-16 h-16 rounded-[2rem] bg-slate-50 flex items-center justify-center text-slate-200">
                            <TrendingUp size={32} />
                        </div>
                        <div className="space-y-1">
                            <p className="text-lg font-black text-slate-800 uppercase tracking-tight">Signal Silence</p>
                            <p className="text-xs font-medium text-slate-400 max-w-[280px]">Deploy your tactical job requirements to begin intercepting candidate signals.</p>
                        </div>
                        <Link href="/dashboard/employer/jobs/new" className="mt-4 px-10 py-4 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-blue-600 transition-all shadow-xl shadow-slate-900/10 active:scale-95">
                            Launch Job Posting
                        </Link>
                    </div>
                </SectionCard>
            </motion.div>
        </div>
    );
}
