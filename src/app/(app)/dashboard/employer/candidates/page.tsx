"use client";

import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";
import { useSearchParams, useRouter } from "next/navigation";
import { Users, Loader2, X, Mail, MapPin, ExternalLink } from "lucide-react";
import { PageHeader, EmptyState, Badge, CompanyAvatar } from "@/components/dashboard/ui";
import CandidateCard from "@/components/dashboard/employer/CandidateCard";
import { AnimatePresence, motion } from "framer-motion";

export default function CandidatesPage() {
    const [applications, setApplications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);
    const [selectedApp, setSelectedApp] = useState<any | null>(null);
    const [template, setTemplate] = useState<"INTERVIEW" | "FOLLOW_UP" | "CLOSE">("INTERVIEW");
    const searchParams = useSearchParams();
    const router = useRouter();
    const jobId = searchParams.get("jobId");

    useEffect(() => {
        const fetchApplications = async () => {
            try {
                const url = jobId 
                    ? `/api/employer/applications?jobId=${jobId}` 
                    : "/api/employer/applications";
                const res = await apiFetch(url);
                if (res.ok) setApplications(await res.json());
            } finally {
                setLoading(false);
            }
        };
        fetchApplications();
    }, [jobId]);

    const handleStatusUpdate = async (id: string, status: "SHORTLISTED" | "REJECTED" | "INTERVIEWING" | "ACCEPTED") => {
        setUpdating(id);
        try {
            const res = await apiFetch(`/api/employer/applications/${id}`, {
                method: "PATCH",
                body: JSON.stringify({ status }),
            });
            if (res.ok) {
                setApplications((prev) => prev.map((app) => (app.id === id ? { ...app, status } : app)));
                if (selectedApp?.id === id) setSelectedApp((prev: any) => (prev ? { ...prev, status } : prev));
                router.refresh();
            }
        } finally {
            setUpdating(null);
        }
    };

    const pendingOver72h = applications.filter((app) => {
        if (app.status !== "PENDING" || !app.createdAt) return false;
        return Date.now() - new Date(app.createdAt).getTime() > 72 * 60 * 60 * 1000;
    }).length;

    const respondedCount = applications.filter((app) => app.status !== "PENDING").length;
    const responseRate = applications.length > 0 ? Math.round((respondedCount / applications.length) * 100) : 0;

    const templateMessage = (app: any) => {
        const candidate = app?.user?.jobSeeker?.full_name || "there";
        const role = app?.job?.title || "the role";
        if (template === "INTERVIEW") return `Hi ${candidate}, thanks for applying for ${role}. We'd like to invite you to an interview.`;
        if (template === "FOLLOW_UP") return `Hi ${candidate}, quick follow-up on your ${role} application. Please share your availability this week.`;
        return `Hi ${candidate}, thank you for your interest in ${role}. We have moved forward with another candidate for now.`;
    };

    const openMailDraft = (app: any) => {
        const email = app?.user?.email;
        if (!email) return;
        const subject = encodeURIComponent(`Update on your application: ${app?.job?.title || "WorkBridge"}`);
        const body = encodeURIComponent(templateMessage(app));
        window.open(`mailto:${email}?subject=${subject}&body=${body}`, "_blank");
    };

    const openWhatsApp = (app: any) => {
        const phone = app?.user?.jobSeeker?.phone;
        if (!phone) return;
        const candidate = app?.user?.jobSeeker?.full_name || "Candidate";
        const role = app?.job?.title || "the role";
        const text = encodeURIComponent(`Hi ${candidate}, this is from the team at WorkBridge. We're interested in your application for ${role}. Are you available for a quick chat?`);
        window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${text}`, "_blank");
    };

    const callPhoneNumber = (app: any) => {
        const phone = app?.user?.jobSeeker?.phone;
        if (!phone) return;
        window.open(`tel:${phone}`, "_self");
    };

    const handleReportCandidate = async (app: any) => {
        try {
            const res = await apiFetch("/api/trust/report", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    targetUserId: app?.user?.id,
                    contextType: "application",
                    contextId: app?.id,
                    reason: "Suspicious candidate activity",
                }),
            });
            if (!res.ok) throw new Error();
        } catch {
            // non-blocking UX
        }
    };

    const handleBlockCandidate = async (app: any) => {
        try {
            await apiFetch("/api/trust/block", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ blockedUserId: app?.user?.id }),
            });
            setApplications((prev) => prev.filter((item) => item.user?.id !== app?.user?.id));
            if (selectedApp?.user?.id === app?.user?.id) {
                setSelectedApp(null);
            }
            router.refresh();
        } catch {
            // non-blocking UX
        }
    };

    const handleBulkReject = async () => {
        const idsToReject = applications
            .filter((app) => app.status === "PENDING" && app.meetsRequiredCriteria === false)
            .map((app) => app.id);
            
        if (idsToReject.length === 0) return;
        
        setUpdating("bulk");
        try {
            const res = await apiFetch("/api/employer/applications/bulk", {
                method: "PATCH",
                body: JSON.stringify({ applicationIds: idsToReject, status: "REJECTED" }),
            });
            if (res.ok) {
                setApplications((prev) =>
                    prev.map((app) => (idsToReject.includes(app.id) ? { ...app, status: "REJECTED" } : app))
                );
                router.refresh();
            }
        } finally {
            setUpdating(null);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#16324f]" />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20">
            <PageHeader title="Candidates" subtitle="Review the pipeline in a simpler, faster list." />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-stone-200 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Response rate</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{responseRate}%</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Measured from pipeline updates (shortlist/reject/etc).</p>
                </div>
                <div className="rounded-2xl border border-stone-200 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-400">SLA nudges</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{pendingOver72h}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Pending applications older than 72 hours.</p>
                </div>
                <div className="rounded-2xl border border-stone-200 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Template</p>
                    <select
                        value={template}
                        onChange={(e) => setTemplate(e.target.value as any)}
                        className="mt-2 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                    >
                        <option value="INTERVIEW">Interview invite</option>
                        <option value="FOLLOW_UP">Follow up</option>
                        <option value="CLOSE">Close out</option>
                    </select>
                </div>
            </div>

            <div className="flex items-center justify-between mb-4 mt-8">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Pipeline</h2>
                <button
                    onClick={handleBulkReject}
                    disabled={updating === "bulk" || applications.filter((app) => app.status === "PENDING" && app.meetsRequiredCriteria === false).length === 0}
                    className="flex justify-center items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-stone-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                    {updating === "bulk" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Bulk Reject Mismatches"}
                </button>
            </div>

            {applications.length === 0 ? (
                <div className="rounded-2xl border border-stone-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/70">
                    <EmptyState
                        icon={Users}
                        title="No candidates yet"
                        description="Applications will appear here once people start responding to your roles."
                        action={{ label: "Review roles", href: "/dashboard/employer/jobs" }}
                        iconColor="text-[#16324f]"
                    />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
                    {/* PENDING COLUMN */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-slate-900 dark:text-white">New</h3>
                            <Badge label={applications.filter((a: any) => a.status === "PENDING").length.toString()} variant="secondary" />
                        </div>
                        {applications
                            .filter((a: any) => a.status === "PENDING")
                            .sort((a: any, b: any) => (b.screeningScore || 0) - (a.screeningScore || 0))
                            .map((app: any) => (
                            <CandidateCard
                                key={app.id}
                                application={app}
                                onViewProfile={() => setSelectedApp(app)}
                                onStatusUpdate={(status) => handleStatusUpdate(app.id, status)}
                                updating={updating === app.id}
                            />
                        ))}
                    </div>

                    {/* SHORTLISTED COLUMN */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-slate-900 dark:text-white">Shortlisted</h3>
                            <Badge label={applications.filter((a: any) => a.status === "SHORTLISTED").length.toString()} variant="green" />
                        </div>
                        {applications
                            .filter((a: any) => a.status === "SHORTLISTED")
                            .sort((a: any, b: any) => (b.screeningScore || 0) - (a.screeningScore || 0))
                            .map((app: any) => (
                            <CandidateCard
                                key={app.id}
                                application={app}
                                onViewProfile={() => setSelectedApp(app)}
                                onStatusUpdate={(status) => handleStatusUpdate(app.id, status)}
                                updating={updating === app.id}
                            />
                        ))}
                    </div>

                    {/* INTERVIEWING COLUMN */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-slate-900 dark:text-white">Interviewing</h3>
                            <Badge label={applications.filter((a: any) => a.status === "INTERVIEWING").length.toString()} variant="blue" />
                        </div>
                        {applications
                            .filter((a: any) => a.status === "INTERVIEWING")
                            .sort((a: any, b: any) => (b.screeningScore || 0) - (a.screeningScore || 0))
                            .map((app: any) => (
                            <CandidateCard
                                key={app.id}
                                application={app}
                                onViewProfile={() => setSelectedApp(app)}
                                onStatusUpdate={(status) => handleStatusUpdate(app.id, status)}
                                updating={updating === app.id}
                            />
                        ))}
                    </div>

                    {/* REJECTED COLUMN */}
                    <div className="flex flex-col gap-4 opacity-75">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-slate-500 dark:text-slate-400">Rejected</h3>
                            <Badge label={applications.filter((a: any) => a.status === "REJECTED").length.toString()} variant="red" />
                        </div>
                        {applications
                            .filter((a: any) => a.status === "REJECTED")
                            .sort((a: any, b: any) => (b.screeningScore || 0) - (a.screeningScore || 0))
                            .map((app: any) => (
                            <CandidateCard
                                key={app.id}
                                application={app}
                                onViewProfile={() => setSelectedApp(app)}
                                onStatusUpdate={(status) => handleStatusUpdate(app.id, status)}
                                updating={updating === app.id}
                            />
                        ))}
                    </div>
                </div>
            )}

            <AnimatePresence>
                {selectedApp && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm" onClick={() => setSelectedApp(null)} />
                        <motion.div
                            initial={{ opacity: 0, y: 16, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 16, scale: 0.98 }}
                            className="relative max-h-[90vh] w-full max-w-2xl overflow-auto rounded-[2rem] border border-stone-200 bg-[#fbf8f1] p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <CompanyAvatar logoUrl={null} name={selectedApp.user?.jobSeeker?.full_name || "?"} />
                                    <div>
                                        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{selectedApp.user?.jobSeeker?.full_name || "Anonymous seeker"}</h2>
                                        <p className="mt-1 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"><Mail size={14} />{selectedApp.user?.email}</p>
                                        <p className="mt-1 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"><MapPin size={14} />{selectedApp.user?.jobSeeker?.location || "No location"}</p>
                                        {selectedApp.user?.jobSeeker?.phone && (
                                            <p className="mt-1 flex items-center gap-2 text-sm font-medium text-[#16324f] dark:text-slate-300">
                                                <span className="inline-flex items-center justify-center rounded bg-stone-100 px-1.5 py-0.5 text-[10px] dark:bg-slate-800">Direct</span>
                                                {selectedApp.user.jobSeeker.phone}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <button onClick={() => setSelectedApp(null)} className="rounded-xl p-2 text-slate-400 hover:bg-stone-100 dark:hover:bg-slate-900">
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="mt-6 space-y-6">
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge label={selectedApp.status} variant={selectedApp.status === "SHORTLISTED" || selectedApp.status === "ACCEPTED" ? "green" : selectedApp.status === "REJECTED" ? "red" : "yellow"} />
                                    <Badge label={selectedApp.job?.title || "Role"} variant="outline" />
                                    {selectedApp.screeningScore !== undefined && <Badge label={`${selectedApp.screeningScore}% fit`} variant="blue" />}
                                    {selectedApp.meetsRequiredCriteria !== undefined && (
                                        <Badge label={selectedApp.meetsRequiredCriteria ? "Meets requirements" : "Missing requirements"} variant={selectedApp.meetsRequiredCriteria ? "green" : "yellow"} />
                                    )}
                                </div>

                                {selectedApp.screeningSummary && (
                                    <div>
                                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Screening summary</p>
                                        <p className="text-sm text-slate-700 dark:text-slate-300">{selectedApp.screeningSummary}</p>
                                    </div>
                                )}

                                {selectedApp.screeningBreakdown?.length > 0 && (
                                    <div>
                                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Checklist</p>
                                        <div className="space-y-2">
                                            {selectedApp.screeningBreakdown.map((item: any, index: number) => (
                                                <div key={`${item.label}-${index}`} className="rounded-2xl border border-stone-200 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-900">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.label}</p>
                                                        <Badge label={item.met ? "Met" : "Missing"} variant={item.met ? "green" : item.required ? "yellow" : "secondary"} />
                                                    </div>
                                                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{item.detail}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {selectedApp.user?.jobSeeker?.bio && (
                                    <div>
                                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Summary</p>
                                        <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">{selectedApp.user.jobSeeker.bio}</p>
                                    </div>
                                )}

                                {selectedApp.user?.jobSeeker?.skills?.length > 0 && (
                                    <div>
                                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Skills</p>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedApp.user.jobSeeker.skills.map((skill: string) => <Badge key={skill} label={skill} variant="secondary" />)}
                                        </div>
                                    </div>
                                )}

                                {selectedApp.user?.jobSeeker?.experience?.length > 0 && (
                                    <div>
                                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Experience</p>
                                        <div className="space-y-3">
                                            {selectedApp.user.jobSeeker.experience.map((exp: any, index: number) => (
                                                <div key={index} className="rounded-2xl border border-stone-200 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-900">
                                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{exp.role}</p>
                                                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{exp.company}</p>
                                                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{exp.description}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                            </div>

                            <div className="mt-6 border-t border-stone-200 pt-5 dark:border-slate-800 space-y-3">
                                {/* Primary Actions — context-aware by status */}
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                    {(selectedApp.status === "PENDING" || selectedApp.status === "REJECTED") && (
                                        <button
                                            onClick={() => handleStatusUpdate(selectedApp.id, "SHORTLISTED")}
                                            disabled={updating === selectedApp.id}
                                            className="flex-1 rounded-xl bg-[#16324f] py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                                        >
                                            {updating === selectedApp.id ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Shortlist"}
                                        </button>
                                    )}
                                    {selectedApp.status === "SHORTLISTED" && (
                                        <button
                                            onClick={() => handleStatusUpdate(selectedApp.id, "INTERVIEWING")}
                                            disabled={updating === selectedApp.id}
                                            className="flex-1 rounded-xl bg-[#16324f] py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                                        >
                                            {updating === selectedApp.id ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Move to Interview"}
                                        </button>
                                    )}
                                    {selectedApp.status === "INTERVIEWING" && (
                                        <button
                                            onClick={() => handleStatusUpdate(selectedApp.id, "ACCEPTED")}
                                            disabled={updating === selectedApp.id}
                                            className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                                        >
                                            {updating === selectedApp.id ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Mark as Hired"}
                                        </button>
                                    )}
                                    {(selectedApp.status === "PENDING" || selectedApp.status === "SHORTLISTED" || selectedApp.status === "INTERVIEWING" || selectedApp.status === "ACCEPTED") && (
                                        <button
                                            onClick={() => handleStatusUpdate(selectedApp.id, "REJECTED")}
                                            disabled={updating === selectedApp.id}
                                            className="flex-1 rounded-xl border border-stone-200 py-3 text-sm font-semibold text-slate-700 hover:bg-stone-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900 disabled:opacity-60"
                                        >
                                            {updating === selectedApp.id ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Reject Candidate"}
                                        </button>
                                    )}
                                </div>
                                
                                {selectedApp.status === "ACCEPTED" && (
                                    <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-center dark:bg-emerald-900/20 dark:border-emerald-800/50">
                                        <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">🎉 Candidate Hired!</p>
                                        <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">Remember to close the job if you are done hiring.</p>
                                    </div>
                                )}

                                {/* Secondary Actions — always available */}
                                <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                                    <button onClick={() => openMailDraft(selectedApp)} className="rounded-xl border border-stone-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-stone-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900 sm:flex-1">
                                        Email
                                    </button>
                                    {selectedApp.user?.jobSeeker?.phone && (
                                        <>
                                            <button onClick={() => openWhatsApp(selectedApp)} className="rounded-xl border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/50 dark:text-emerald-300 dark:hover:bg-emerald-950/30 sm:flex-1">
                                                WhatsApp
                                            </button>
                                            <button onClick={() => callPhoneNumber(selectedApp)} className="rounded-xl border border-sky-200 px-3 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-50 dark:border-sky-900/50 dark:text-sky-300 dark:hover:bg-sky-950/30 sm:flex-1">
                                                Call
                                            </button>
                                        </>
                                    )}
                                    <button onClick={() => handleReportCandidate(selectedApp)} className="rounded-xl border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 dark:border-amber-900/50 dark:text-amber-300 dark:hover:bg-amber-950/30 sm:flex-1">
                                        Report
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
