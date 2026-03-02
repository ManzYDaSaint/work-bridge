"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Users, Briefcase, MapPin, Calendar, ExternalLink, Mail, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { PageHeader, EmptyState, Badge } from "@/components/dashboard/ui";
import { motion } from "framer-motion";
import Link from "next/link";

export default function CandidatesPage() {
    const [applications, setApplications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);

    useEffect(() => {
        const fetchApplications = async () => {
            try {
                const res = await apiFetch("/api/employer/applications");
                if (res.ok) {
                    setApplications(await res.json());
                }
            } finally {
                setLoading(false);
            }
        };
        fetchApplications();
    }, []);

    const handleStatusUpdate = async (id: string, status: 'ACCEPTED' | 'REJECTED') => {
        setUpdating(id);
        try {
            const res = await apiFetch(`/api/employer/applications/${id}`, {
                method: "PATCH",
                body: JSON.stringify({ status })
            });

            if (res.ok) {
                setApplications(prev => prev.map(app =>
                    app.id === id ? { ...app, status } : app
                ));
            }
        } finally {
            setUpdating(null);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
    );

    return (
        <div className="space-y-6 pb-20">
            <PageHeader
                title="Talent Pipeline"
                subtitle="Evaluate and manage candidates applying for your operational roles"
            />

            <div className="space-y-4">
                {applications.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200">
                        <EmptyState
                            icon={Users}
                            title="No Applicants Detected"
                            description="The pipeline is currently empty. Strategic outreach or high-impact job descriptions may increase traction."
                            action={{ label: "Optimize Job Posts", href: "/dashboard/employer/jobs" }}
                            iconColor="text-green-500"
                        />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {applications.map((app: any, idx) => (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                key={app.id}
                                className="bg-white rounded-3xl border border-slate-200 p-6 hover:shadow-lg hover:border-blue-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 font-black text-xl">
                                        {app.user?.jobSeeker?.fullName?.[0] || "?"}
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-slate-900">{app.user?.jobSeeker?.fullName || "Anonymous Seeker"}</h3>
                                            <Badge label={app.status} variant={app.status === 'ACCEPTED' ? 'green' : app.status === 'REJECTED' ? 'red' : 'yellow'} />
                                        </div>
                                        <p className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                                            <Mail size={12} className="text-slate-400" /> {app.user?.email}
                                        </p>
                                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1.5 mt-1">
                                            <Briefcase size={12} /> {app.job?.title}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2 md:max-w-[300px]">
                                    {app.user?.jobSeeker?.skills?.slice(0, 4).map((skill: string, i: number) => (
                                        <span key={i} className="px-3 py-1 bg-slate-50 text-slate-600 text-[9px] font-bold rounded-lg border border-slate-100">
                                            {skill}
                                        </span>
                                    ))}
                                </div>

                                <div className="flex items-center gap-3">
                                    {updating === app.id ? (
                                        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                                    ) : (
                                        <div className="flex items-center gap-2 border-l border-slate-100 pl-3 ml-2">
                                            <button
                                                onClick={() => handleStatusUpdate(app.id, 'ACCEPTED')}
                                                disabled={app.status === 'ACCEPTED'}
                                                className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-green-600 hover:bg-green-50 transition-all disabled:opacity-50"
                                            >
                                                <CheckCircle size={20} />
                                            </button>
                                            <button
                                                onClick={() => handleStatusUpdate(app.id, 'REJECTED')}
                                                disabled={app.status === 'REJECTED'}
                                                className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all disabled:opacity-50"
                                            >
                                                <XCircle size={20} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
