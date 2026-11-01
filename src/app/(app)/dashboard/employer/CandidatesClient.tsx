"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Users, Loader2, X, Mail, MapPin, Lock } from "lucide-react";
import { PageHeader, EmptyState, Badge, CompanyAvatar } from "@/components/dashboard/ui";
import CandidateCard from "@/components/dashboard/employer/CandidateCard";
import CandidateScorecard from "@/components/dashboard/CandidateScorecard";
import { AnimatePresence, motion } from "framer-motion";
import { 
    updateApplicationStatus, 
    bulkRejectApplications, 
    markApplicationAsViewed 
} from "@/app/(app)/dashboard/employer/actions";

export default function CandidatesClient({ 
    initialApplications,
    plan = "FREE",
    schedulingLink,
    companyName,
}: { 
    initialApplications: any[]; 
    plan?: string;
    schedulingLink?: string;
    companyName?: string;
}) {
    const [applications, setApplications] = useState<any[]>(initialApplications);
    const [updating, setUpdating] = useState<string | null>(null);
    const [selectedApp, setSelectedApp] = useState<any | null>(null);
    const [template, setTemplate] = useState<"INTERVIEW" | "FOLLOW_UP" | "CLOSE">("INTERVIEW");
    const [rejectingAppId, setRejectingAppId] = useState<string | null>(null);
    const [selectedRejectReason, setSelectedRejectReason] = useState<string>("Experience or skill mismatch");
    const [draggedAppId, setDraggedAppId] = useState<string | null>(null);
    const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [minMatchPct, setMinMatchPct] = useState<number>(0);
    const [rejectDelay, setRejectDelay] = useState<"IMMEDIATE" | "24H" | "48H">("IMMEDIATE");
    const router = useRouter();

    const REJECTION_REASONS = [
        "Experience or skill mismatch",
        "Educational qualification gap",
        "Salary expectation out of range",
        "Position filled internally / another applicant chosen",
        "Unresponsive to candidate outreach",
        "Overqualified for this scope",
        "Location or commute constraint"
    ];

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, appId: string) => {
        setDraggedAppId(appId);
        e.dataTransfer.setData("text/plain", appId);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragEnd = () => {
        setDraggedAppId(null);
        setDragOverColumn(null);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>, columnStatus: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (dragOverColumn !== columnStatus) {
            setDragOverColumn(columnStatus);
        }
    };

    const handleDragLeave = (columnStatus: string) => {
        if (dragOverColumn === columnStatus) {
            setDragOverColumn(null);
        }
    };

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>, targetStatus: "PENDING" | "SHORTLISTED" | "INTERVIEWING" | "ACCEPTED" | "REJECTED") => {
        e.preventDefault();
        setDragOverColumn(null);

        const appId = draggedAppId || e.dataTransfer.getData("text/plain");
        if (!appId) return;

        const targetApp = applications.find(a => a.id === appId);
        if (!targetApp || targetApp.status === targetStatus) return;

        // If dragging into REJECTED, trigger structured reason modal
        if (targetStatus === "REJECTED") {
            setRejectingAppId(appId);
            return;
        }

        // Optimistic UI state update
        setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: targetStatus } : a));

        try {
            await handleStatusUpdate(appId, targetStatus);
        } catch {
            // Revert on failure
            setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: targetApp.status } : a));
        }
    };

    const handleViewApplication = async (app: any) => {
        setSelectedApp(app);
        if (!app.viewed_at) {
            try {
                await markApplicationAsViewed(app.id);
            } catch (err) {
                console.error("Failed to mark as viewed", err);
            }
        }
    };

    const handleStatusUpdate = async (
        id: string, 
        status: "PENDING" | "SHORTLISTED" | "REJECTED" | "INTERVIEWING" | "ACCEPTED", 
        interviewLink?: string,
        reason?: string
    ) => {
        setUpdating(id);
        try {
            const result = await updateApplicationStatus(id, status, interviewLink, reason);
            if (result.success) {
                setApplications((prev) => prev.map((app) => (app.id === id ? { ...app, status, interview_link: interviewLink, rejection_reason: reason } : app)));
                if (selectedApp?.id === id) setSelectedApp((prev: any) => (prev ? { ...prev, status, rejection_reason: reason } : prev));
                router.refresh();
                toast.success(`Candidate marked as ${status.toLowerCase()}${reason ? ` (${reason})` : ""}.`);
            } else {
                toast.error(result.error || "Failed to update status.");
            }
        } catch (err) {
            console.error(err);
            toast.error("An unexpected error occurred.");
        } finally {
            setUpdating(null);
            setRejectingAppId(null);
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
        if (template === "INTERVIEW") {
            const scheduleText = schedulingLink
                ? ` Please book a convenient slot here: ${schedulingLink}`
                : " We will be in touch shortly with available time slots.";
            return `Hi ${candidate}, thanks for applying for ${role}. We'd like to invite you to an interview.${scheduleText}`;
        }
        if (template === "FOLLOW_UP") return `Hi ${candidate}, quick follow-up on your ${role} application. Please share your availability this week.`;
        return `Hi ${candidate}, thank you for your interest in ${role}. We have moved forward with another candidate for now.`;
    };

    const openMailDraft = (app: any) => {
        const email = app?.user?.email;
        if (!email) return;
        const subject = encodeURIComponent(`Update on your application: ${app?.job?.title || "Aganyu"}`);
        const body = encodeURIComponent(templateMessage(app));
        window.open(`mailto:${email}?subject=${subject}&body=${body}`, "_blank");
    };

    const openWhatsApp = (app: any) => {
        const phone = app?.user?.jobSeeker?.phone;
        if (!phone) return;
        const candidate = app?.user?.jobSeeker?.full_name || "Candidate";
        const role = app?.job?.title || "the role";
        const teamName = companyName || "Aganyu";
        const scheduleText = schedulingLink
            ? ` You can book a slot here: ${schedulingLink}`
            : "";
        const isInterview = template === "INTERVIEW" || app?.status === "INTERVIEWING";
        const text = isInterview
            ? encodeURIComponent(`Hi ${candidate}, this is from the team at ${teamName}. We'd love to interview you for ${role}.${scheduleText}`)
            : encodeURIComponent(`Hi ${candidate}, this is from the team at ${teamName}. We're interested in your application for ${role}. Are you available for a quick chat?`);
        window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${text}`, "_blank");
    };


    const callPhoneNumber = (app: any) => {
        const phone = app?.user?.jobSeeker?.phone;
        if (!phone) return;
        window.open(`tel:${phone}`, "_self");
    };

    const handleReportCandidate = async (app: any) => {
        // Reporting is handled by a specialized trust API, keeping as is for now unless a server action is requested.
        // In a full migration, we would create a reportCandidate server action.
        try {
            const res = await fetch("/api/trust/report", {
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
            toast.success("Report submitted.");
        } catch {
            toast.error("Failed to submit report.");
        }
    };

    const handleBulkReject = async () => {
        const idsToReject = applications
            .filter((app) => app.status === "PENDING" && app.meetsRequiredCriteria === false)
            .map((app) => app.id);
            
        if (idsToReject.length === 0) return;
        
        setUpdating("bulk");
        try {
            const result = await bulkRejectApplications(idsToReject);
            if (result.success) {
                setApplications((prev) =>
                    prev.map((app) => (idsToReject.includes(app.id) ? { ...app, status: "REJECTED" } : app))
                );
                router.refresh();
                toast.success("Mismatched candidates rejected.");
            } else {
                toast.error(result.error || "Failed to bulk reject.");
            }
        } catch (err) {
            console.error(err);
            toast.error("An unexpected error occurred.");
        } finally {
            setUpdating(null);
        }
    };

    const filteredApplications = applications.filter((app) => {
        if (minMatchPct > 0) {
            const score = app.similarity !== undefined ? app.similarity : (app.screeningScore || 0);
            if (score < minMatchPct) return false;
        }
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            const name = (app?.user?.jobSeeker?.full_name || app?.guest_full_name || "").toLowerCase();
            const email = (app?.user?.email || app?.guest_email || "").toLowerCase();
            const skills = (app?.user?.jobSeeker?.skills || []).map((s: string) => s.toLowerCase());
            const hasSkillMatch = skills.some((s: string) => s.includes(query));
            if (!name.includes(query) && !email.includes(query) && !hasSkillMatch) {
                return false;
            }
        }
        return true;
    });

    return (
        <div className="space-y-6 pb-20">
            <PageHeader title="Candidates" subtitle="Review the pipeline in a simpler, faster list." />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="flex flex-col justify-between rounded-3xl border border-stone-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Response Rate</p>
                    <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{responseRate}%</p>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Pipeline response velocity.</p>
                </div>
                <div className="flex flex-col justify-between rounded-3xl border border-stone-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pending &gt; 72h</p>
                    <p className="mt-1 text-2xl font-black text-amber-600 dark:text-amber-400">{pendingOver72h}</p>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Applications awaiting initial review.</p>
                </div>
                <div className="flex flex-col justify-between rounded-3xl border border-stone-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Outreach Template</p>
                    <select
                        value={template}
                        onChange={(e) => setTemplate(e.target.value as any)}
                        className="mt-1 w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-[#16324f] dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-amber-400"
                    >
                        <option value="INTERVIEW">Interview Invite</option>
                        <option value="FOLLOW_UP">Follow Up</option>
                        <option value="CLOSE">Close Out</option>
                    </select>
                </div>
            </div>

            {/* Pipeline filter toolbar */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Pipeline</h2>
                    {(searchQuery || minMatchPct > 0) && (
                        <button
                            onClick={() => { setSearchQuery(""); setMinMatchPct(0); }}
                            className="rounded-lg bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300"
                        >
                            Clear filters
                        </button>
                    )}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                        type="text"
                        placeholder="Search name or skill…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#16324f] dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:w-52"
                    />
                    <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-500 whitespace-nowrap dark:text-slate-400">
                            Min match: <span className="font-bold text-slate-800 dark:text-white">{minMatchPct}%</span>
                        </label>
                        <input
                            type="range"
                            min={0}
                            max={100}
                            step={5}
                            value={minMatchPct}
                            onChange={(e) => setMinMatchPct(Number(e.target.value))}
                            className="w-28 accent-[#16324f]"
                        />
                    </div>
                    <button
                        onClick={handleBulkReject}
                        disabled={updating === "bulk" || applications.filter((app) => app.status === "PENDING" && app.meetsRequiredCriteria === false).length === 0}
                        className="flex justify-center items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-stone-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                        {updating === "bulk" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Bulk Reject Mismatches"}
                    </button>
                </div>
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
                    <div 
                        onDragOver={(e) => handleDragOver(e, "PENDING")}
                        onDragLeave={() => handleDragLeave("PENDING")}
                        onDrop={(e) => handleDrop(e, "PENDING")}
                        className={`flex flex-col gap-4 rounded-3xl p-3 transition-colors ${
                            dragOverColumn === "PENDING" 
                                ? "bg-amber-50/70 border-2 border-dashed border-amber-300 dark:bg-amber-950/20 dark:border-amber-700" 
                                : "bg-stone-50/50 border border-transparent dark:bg-slate-900/40"
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-slate-900 dark:text-white">New</h3>
                                <Badge label={filteredApplications.filter((a: any) => a.status === "PENDING").length.toString()} variant="secondary" />
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium hidden lg:inline">Drop to reset</span>
                        </div>
                        {filteredApplications
                            .filter((a: any) => a.status === "PENDING")
                            .sort((a: any, b: any) => {
                                if (a.similarity !== undefined && b.similarity !== undefined) {
                                    return b.similarity - a.similarity;
                                }
                                return (b.screeningScore || 0) - (a.screeningScore || 0);
                            })
                            .map((app: any, idx: number) => {
                                const isLocked = plan === "FREE" && idx >= 3;
                                return (
                                    <div key={app.id} className="relative">
                                        <div className={`transition-all ${isLocked ? "blur-sm grayscale select-none pointer-events-none opacity-40" : ""}`}>
                                            <CandidateCard
                                                application={app}
                                                isDraggable={!isLocked}
                                                onDragStart={(e) => handleDragStart(e, app.id)}
                                                onDragEnd={handleDragEnd}
                                                onViewProfile={() => !isLocked && handleViewApplication(app)}
                                                onStatusUpdate={(status, interviewLink) => !isLocked && handleStatusUpdate(app.id, status, interviewLink)}
                                                updating={updating === app.id}
                                            />
                                        </div>
                                        {isLocked && (
                                            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-white/20 backdrop-blur-[2px] p-4 text-center dark:bg-slate-900/20">
                                                <Lock className="h-6 w-6 text-slate-600 dark:text-slate-300 mb-2" />
                                                <p className="text-xs font-semibold text-slate-900 dark:text-white">Premium Feature</p>
                                                <a href="/dashboard/employer/billing" className="mt-2 text-xs font-semibold text-[#16324f] hover:underline dark:text-blue-400">
                                                    Upgrade to view all
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                    </div>

                    {/* SHORTLISTED COLUMN */}
                    <div 
                        onDragOver={(e) => handleDragOver(e, "SHORTLISTED")}
                        onDragLeave={() => handleDragLeave("SHORTLISTED")}
                        onDrop={(e) => handleDrop(e, "SHORTLISTED")}
                        className={`flex flex-col gap-4 rounded-3xl p-3 transition-colors ${
                            dragOverColumn === "SHORTLISTED" 
                                ? "bg-emerald-50/70 border-2 border-dashed border-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-700" 
                                : "bg-stone-50/50 border border-transparent dark:bg-slate-900/40"
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-slate-900 dark:text-white">Shortlisted</h3>
                                <Badge label={filteredApplications.filter((a: any) => a.status === "SHORTLISTED").length.toString()} variant="green" />
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium hidden lg:inline">Drop to shortlist</span>
                        </div>
                        {filteredApplications
                            .filter((a: any) => a.status === "SHORTLISTED")
                            .sort((a: any, b: any) => (b.screeningScore || 0) - (a.screeningScore || 0))
                            .map((app: any) => (
                            <CandidateCard
                                key={app.id}
                                application={app}
                                isDraggable={true}
                                onDragStart={(e) => handleDragStart(e, app.id)}
                                onDragEnd={handleDragEnd}
                                onViewProfile={() => handleViewApplication(app)}
                                onStatusUpdate={(status, interviewLink) => handleStatusUpdate(app.id, status, interviewLink)}
                                updating={updating === app.id}
                            />
                        ))}
                    </div>

                    {/* INTERVIEWING COLUMN */}
                    <div 
                        onDragOver={(e) => handleDragOver(e, "INTERVIEWING")}
                        onDragLeave={() => handleDragLeave("INTERVIEWING")}
                        onDrop={(e) => handleDrop(e, "INTERVIEWING")}
                        className={`flex flex-col gap-4 rounded-3xl p-3 transition-colors ${
                            dragOverColumn === "INTERVIEWING" 
                                ? "bg-sky-50/70 border-2 border-dashed border-sky-300 dark:bg-sky-950/20 dark:border-sky-700" 
                                : "bg-stone-50/50 border border-transparent dark:bg-slate-900/40"
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-slate-900 dark:text-white">Interviewing</h3>
                                <Badge label={filteredApplications.filter((a: any) => a.status === "INTERVIEWING").length.toString()} variant="blue" />
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium hidden lg:inline">Drop to interview</span>
                        </div>
                        {filteredApplications
                            .filter((a: any) => a.status === "INTERVIEWING")
                            .sort((a: any, b: any) => (b.screeningScore || 0) - (a.screeningScore || 0))
                            .map((app: any) => (
                            <CandidateCard
                                key={app.id}
                                application={app}
                                isDraggable={true}
                                onDragStart={(e) => handleDragStart(e, app.id)}
                                onDragEnd={handleDragEnd}
                                onViewProfile={() => handleViewApplication(app)}
                                onStatusUpdate={(status, interviewLink) => handleStatusUpdate(app.id, status, interviewLink)}
                                updating={updating === app.id}
                            />
                        ))}
                    </div>

                    {/* REJECTED COLUMN */}
                    <div 
                        onDragOver={(e) => handleDragOver(e, "REJECTED")}
                        onDragLeave={() => handleDragLeave("REJECTED")}
                        onDrop={(e) => handleDrop(e, "REJECTED")}
                        className={`flex flex-col gap-4 rounded-3xl p-3 transition-colors ${
                            dragOverColumn === "REJECTED" 
                                ? "bg-rose-50/70 border-2 border-dashed border-rose-300 dark:bg-rose-950/20 dark:border-rose-700" 
                                : "bg-stone-50/50 border border-transparent dark:bg-slate-900/40 opacity-80"
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-slate-500 dark:text-slate-400">Rejected</h3>
                                <Badge label={filteredApplications.filter((a: any) => a.status === "REJECTED").length.toString()} variant="red" />
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium hidden lg:inline">Drop to reject</span>
                        </div>
                        {filteredApplications
                            .filter((a: any) => a.status === "REJECTED")
                            .sort((a: any, b: any) => (b.screeningScore || 0) - (a.screeningScore || 0))
                            .map((app: any) => (
                            <CandidateCard
                                key={app.id}
                                application={app}
                                isDraggable={true}
                                onDragStart={(e) => handleDragStart(e, app.id)}
                                onDragEnd={handleDragEnd}
                                onViewProfile={() => handleViewApplication(app)}
                                onStatusUpdate={(status, interviewLink) => handleStatusUpdate(app.id, status, interviewLink)}
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
                                    {selectedApp.isGuestApplication && (
                                        <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                            Guest Applicant
                                        </span>
                                    )}
                                    {selectedApp.resumeUrl && (
                                        <a
                                            href={selectedApp.resumeUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1.5 rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-300"
                                        >
                                            📄 Download Attached CV
                                        </a>
                                    )}
                                    {selectedApp.screeningScore !== undefined && <Badge label={`${selectedApp.screeningScore}% fit`} variant="blue" />}
                                    {selectedApp.meetsRequiredCriteria !== undefined && (
                                        <Badge label={selectedApp.meetsRequiredCriteria ? "Meets requirements" : "Missing requirements"} variant={selectedApp.meetsRequiredCriteria ? "green" : "yellow"} />
                                    )}
                                </div>

                                {selectedApp.resumeUrl && (
                                    <div className="rounded-2xl border border-stone-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                                        <div className="mb-2 flex items-center justify-between">
                                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Attached Resume Preview</p>
                                            <a
                                                href={selectedApp.resumeUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-xs font-medium text-[#16324f] hover:underline dark:text-sky-400"
                                            >
                                                Open Fullscreen ↗
                                            </a>
                                        </div>
                                        <iframe
                                            src={selectedApp.resumeUrl}
                                            className="h-80 w-full rounded-xl border border-stone-200/80 bg-stone-50 dark:border-slate-800 dark:bg-slate-950"
                                            title="Candidate Resume"
                                        />
                                    </div>
                                )}

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

                                {/* Candidate Evaluation Scorecard */}
                                <CandidateScorecard applicationId={selectedApp.id} />

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
                                            {updating === selectedApp.id ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Mark as Hired (+5 Credits)"}
                                        </button>
                                    )}
                                    {(selectedApp.status === "PENDING" || selectedApp.status === "SHORTLISTED" || selectedApp.status === "INTERVIEWING" || selectedApp.status === "ACCEPTED") && (
                                        <button
                                            onClick={() => setRejectingAppId(selectedApp.id)}
                                            disabled={updating === selectedApp.id}
                                            className="flex-1 rounded-xl border border-stone-200 py-3 text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:border-slate-700 dark:text-rose-400 dark:hover:bg-rose-950/30 disabled:opacity-60"
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

            {/* Structured Rejection Reason Modal */}
            <AnimatePresence>
                {rejectingAppId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs"
                            onClick={() => setRejectingAppId(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative w-full max-w-md rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 space-y-4"
                        >
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                    Archive / Reject Candidate
                                </h3>
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    Categorize why this candidate is not moving forward to feed recruitment analytics.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    Primary Reason
                                </label>
                                <select
                                    value={selectedRejectReason}
                                    onChange={(e) => setSelectedRejectReason(e.target.value)}
                                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-xs font-medium text-slate-800 outline-none focus:border-[#16324f] dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                >
                                    {REJECTION_REASONS.map((reason) => (
                                        <option key={reason} value={reason}>
                                            {reason}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    Gentle Rejection Delay
                                </label>
                                <select
                                    value={rejectDelay}
                                    onChange={(e) => setRejectDelay(e.target.value as any)}
                                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-xs font-medium text-slate-800 outline-none focus:border-[#16324f] dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                >
                                    <option value="IMMEDIATE">Send email immediately</option>
                                    <option value="24H">Schedule gentle delay (after 24 hours)</option>
                                    <option value="48H">Schedule gentle delay (after 48 hours)</option>
                                </select>
                                <p className="text-[11px] text-slate-400">
                                    Delaying notification gives applicants a softer, more respectful experience.
                                </p>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setRejectingAppId(null)}
                                    className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-stone-100 dark:text-slate-300 dark:hover:bg-slate-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={updating === rejectingAppId}
                                    onClick={() => handleStatusUpdate(rejectingAppId, "REJECTED", undefined, selectedRejectReason)}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
                                >
                                    {updating === rejectingAppId ? <Loader2 size={13} className="animate-spin" /> : (rejectDelay !== "IMMEDIATE" ? `Confirm with ${rejectDelay} Delay` : "Confirm Rejection")}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
