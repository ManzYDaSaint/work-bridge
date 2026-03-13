"use client";

import { useEffect, useState } from "react";
import { apiFetch, apiFetchJson } from "@/lib/api";
import { Job } from "@/types";
import { X, User, FileText, MapPin, Star, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";

interface Applicant {
    id: string;
    status: string;
    matchScore?: number;
    jobSeeker: {
        fullName: string;
        location?: string;
        bio?: string;
        skills?: string[];
        resumeUrl?: string;
    };
}

interface ApplicantManagementModalProps {
    job: Job;
    onClose: () => void;
}

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Applicant {
    id: string;
    status: string;
    matchScore?: number;
    jobSeeker: {
        fullName: string;
        location?: string;
        bio?: string;
        skills?: string[];
        resumeUrl?: string;
    };
}

interface ApplicantManagementModalProps {
    job: Job;
    onClose: () => void;
}

export default function ApplicantManagementModal({ job, onClose }: ApplicantManagementModalProps) {
    const [applicants, setApplicants] = useState<Applicant[]>([]);
    const [loading, setLoading] = useState(true);
    const [chatLoading, setChatLoading] = useState<string | null>(null);
    const router = useRouter();

    const fetchApplicants = async () => {
        try {
            const res = await apiFetch(`/jobs/${job.id}/applicants`);
            const data: Applicant[] = await res.json();
            setApplicants(data);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchApplicants(); }, [job.id]);

    const updateStatus = async (applicationId: string, status: string) => {
        const res = await apiFetchJson(`/jobs/applications/${applicationId}/status`, {
            method: "PATCH",
            body: JSON.stringify({ status }),
        });
        if (res.ok) fetchApplicants();
    };

    const startChat = async (seekerId: string) => {
        setChatLoading(seekerId);
        try {
            const res = await apiFetchJson("/conversations", {
                method: "POST",
                body: JSON.stringify({
                    seekerId,
                    employerId: job.employer.id // Ensure we have the employer ID
                })
            });

            if (res.ok) {
                // This is a bit of a hack since we don't have a global state for activeTab
                // but we can use window events or refresh to the messages page
                onClose();
                // We'll rely on the user manually switching or implement a more robust sync
                // For now, let's just alert or navigate if we were on a separate route
                // Actually, DashboardClient handles tabs. We could use a query param.
                window.location.href = "/dashboard?tab=messages";
            }
        } finally {
            setChatLoading(null);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl flex items-center justify-center p-4 z-[100]">
            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="bg-white dark:bg-slate-950 rounded-[3.5rem] w-full max-w-5xl overflow-hidden h-[90vh] flex flex-col shadow-[0_32px_128px_-32px_rgba(0,0,0,0.4)] border border-white/20 dark:border-slate-800"
            >
                {/* Header */}
                <div className="px-12 py-10 border-b border-slate-100 dark:border-slate-900 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/40">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{job.title}</h3>
                            <span className="px-3 py-1 bg-blue-600/10 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-blue-500/20">
                                Talent Pipeline
                            </span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 font-medium">Strategize and manage candidate progression through recruitment cycles.</p>
                    </div>
                    <button onClick={onClose} className="w-14 h-14 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm border border-slate-100 dark:border-slate-700">
                        <X size={28} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-12 space-y-8">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4">
                            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin shadow-xl shadow-blue-500/10" />
                            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Scanning Network...</p>
                        </div>
                    ) : applicants.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center py-20 bg-slate-50/50 dark:bg-slate-900/20 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800">
                            <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-3xl flex items-center justify-center text-slate-200 mb-8 shadow-sm">
                                <User size={48} />
                            </div>
                            <h4 className="text-2xl font-black text-slate-900 dark:text-white mb-2">No Pulses Detected</h4>
                            <p className="text-slate-400 font-medium max-w-xs">Your broadcasting hasn't attracted candidates yet. Consider refining your strategic narrative.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6">
                            {applicants.map((app, i) => (
                                <motion.div
                                    key={app.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="bg-white dark:bg-slate-900/50 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-8 hover:shadow-2xl hover:border-blue-500/10 transition-all group"
                                >
                                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                                        <div className="flex items-center gap-6">
                                            <div className="w-20 h-20 bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2rem] flex items-center justify-center text-white text-2xl font-black shadow-xl group-hover:scale-110 transition-transform duration-500 overflow-hidden relative">
                                                {app.jobSeeker.fullName.charAt(0)}
                                                <div className="absolute top-0 right-0 w-6 h-6 bg-blue-600 border-4 border-slate-800 rounded-full" />
                                            </div>
                                            <div>
                                                <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                                                    {app.jobSeeker.fullName}
                                                    {app.matchScore !== undefined && app.matchScore > 80 && (
                                                        <span className="flex items-center gap-1 bg-green-500/10 text-green-500 px-3 py-1 rounded-lg text-[10px] uppercase font-black">
                                                            Elite Match
                                                        </span>
                                                    )}
                                                </h4>
                                                <div className="flex items-center gap-4 text-xs font-black text-slate-400 uppercase tracking-widest mt-2">
                                                    <span className="flex items-center gap-1.5">
                                                        <MapPin size={16} className="text-blue-500" />
                                                        {app.jobSeeker.location || "Ghost Ops"}
                                                    </span>
                                                    {app.matchScore !== undefined && (
                                                        <span className="flex items-center gap-1.5 text-indigo-500">
                                                            <Star size={16} className="fill-current" />
                                                            {app.matchScore}% Resonance
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 w-full lg:w-auto">
                                            <div className="flex-1 lg:flex-none">
                                                <select
                                                    value={app.status}
                                                    onChange={(e) => updateStatus(app.id, e.target.value)}
                                                    className="w-full lg:w-48 px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 appearance-none shadow-sm cursor-pointer"
                                                >
                                                    <option value="PENDING">Pulse: Pending</option>
                                                    <option value="REVIEWED">Pulse: Reviewed</option>
                                                    <option value="SHORTLISTED">Status: Shortlisted</option>
                                                    <option value="INTERVIEWING">Phase: Interrogating</option>
                                                    <option value="ACCEPTED">Result: Secure</option>
                                                    <option value="REJECTED">Result: Archive</option>
                                                </select>
                                            </div>

                                            <button
                                                onClick={() => startChat((app as any).userId || app.id)} // userId should be available on the join
                                                disabled={chatLoading === ((app as any).userId || app.id)}
                                                className="w-14 h-14 flex items-center justify-center bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-2xl hover:bg-blue-600 dark:hover:bg-blue-500 hover:text-white dark:hover:text-white transition-all shadow-lg active:scale-90 disabled:opacity-50">
                                                <MessageSquare size={24} />
                                            </button>

                                            {app.jobSeeker.resumeUrl && (
                                                <a href={app.jobSeeker.resumeUrl} target="_blank" rel="noreferrer"
                                                    className="w-14 h-14 flex items-center justify-center bg-blue-600 text-white rounded-2xl hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20 active:scale-90">
                                                    <FileText size={24} />
                                                </a>
                                            )}
                                        </div>
                                    </div>

                                    {app.jobSeeker.bio && (
                                        <p className="mt-8 text-slate-600 dark:text-slate-400 font-medium leading-relaxed max-w-3xl line-clamp-3">
                                            {app.jobSeeker.bio}
                                        </p>
                                    )}

                                    {app.jobSeeker.skills && app.jobSeeker.skills.length > 0 && (
                                        <div className="mt-8 flex flex-wrap gap-2.5">
                                            {app.jobSeeker.skills.map((skill, i) => (
                                                <span key={i} className="px-4 py-2 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-100 dark:border-slate-700/50 group-hover:border-blue-500/20 transition-colors">
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    )
                    }
                </div>
            </motion.div>
        </div>
    );
}
