"use client";

import ReactMarkdown from "react-markdown";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Sparkles, Users, Target, Shield, Check, Loader2, ChevronRight, GraduationCap, X, FileText, ShieldCheck, AlertCircle, Eye } from "lucide-react";
import { PageHeader, Card, Badge } from "@/components/dashboard/ui";
import { motion, AnimatePresence } from "framer-motion";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";

export default function DiscoverCandidatesPage() {
    const { id: jobId } = useParams();
    const [candidates, setCandidates] = useState<any[]>([]);
    const [job, setJob] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [inviting, setInviting] = useState<string | null>(null);
    const [invited, setInvited] = useState<string[]>([]);

    // Qualifications modal state
    const [viewingQualsFor, setViewingQualsFor] = useState<string | null>(null);
    const [qualsData, setQualsData] = useState<any[]>([]);
    const [loadingQuals, setLoadingQuals] = useState(false);

    // AI Resume modal state
    const [generatingResumeFor, setGeneratingResumeFor] = useState<string | null>(null);
    const [aiResumeData, setAiResumeData] = useState<string>("");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [candRes, jobRes] = await Promise.all([
                    apiFetch(`/api/jobs/${jobId}/potential-candidates`),
                    apiFetch(`/api/jobs/${jobId}`)
                ]);

                if (candRes.ok) setCandidates(await candRes.json());
                if (jobRes.ok) setJob(await jobRes.json());
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [jobId]);

    const handleInvite = async (seekerId: string) => {
        setInviting(seekerId);
        try {
            const res = await apiFetch("/api/employer/invite", {
                method: "POST",
                body: JSON.stringify({ jobId, seekerId }),
                headers: { "Content-Type": "application/json" }
            });
            if (res.ok) {
                setInvited([...invited, seekerId]);
            }
        } finally {
            setInviting(null);
        }
    };

    const handleViewQuals = async (seekerId: string) => {
        setViewingQualsFor(seekerId);
        setLoadingQuals(true);
        try {
            const res = await apiFetch(`/api/jobs/${jobId}/candidates/${seekerId}/qualifications`);
            if (res.ok) {
                setQualsData(await res.json());
            }
        } finally {
            setLoadingQuals(false);
        }
    };

    const handleGenerateResume = async (seekerId: string) => {
        setGeneratingResumeFor(seekerId);
        setAiResumeData(""); // prepare skeleton loading state
        try {
            const res = await apiFetch(`/api/jobs/${jobId}/candidates/${seekerId}/ai-resume`);
            const data = await res.json();
            if (res.ok) {
                setAiResumeData(data.markdown);
            } else {
                setAiResumeData("Failed to generate resume: " + data.error);
            }
        } catch (error: any) {
            setAiResumeData("Failed to generate resume: " + error.message);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
    );

    return (
        <div className="space-y-8 pb-20 relative">
            <PageHeader
                title="Talent Discovery"
                subtitle={`AI-matched high-performance candidates for: ${job?.title || "Loading..."}`}
                action={{ label: "Back to Job", href: `/dashboard/employer/jobs/${jobId}`, variant: "secondary" }}
            />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Discovery Insights */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="bg-slate-900 border-none relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 blur-3xl" />
                        <div className="relative z-10 space-y-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                                <Shield size={24} />
                            </div>
                            <h3 className="text-lg font-black text-white leading-tight">Zero-Bias Discovery</h3>
                            <p className="text-xs text-slate-400 leading-relaxed font-medium">
                                Individual identities and raw certificates are redacted. Selection is driven purely by competency and verified qualification matching.
                            </p>
                        </div>
                    </Card>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Matching Criteria</label>
                        <div className="flex flex-wrap gap-2">
                            {job?.skills?.map((s: string, i: number) => (
                                <span key={i} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold rounded-lg border border-slate-200 dark:border-slate-700">
                                    {s}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Candidate Feed */}
                <div className="lg:col-span-3 space-y-4">
                    <AnimatePresence>
                        {candidates.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="bg-slate-50 dark:bg-slate-900/50 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem] p-20 text-center"
                            >
                                <Users size={48} className="mx-auto text-slate-300 mb-4" />
                                <h3 className="text-lg font-black text-slate-700 dark:text-slate-300">No Direct Matches Found</h3>
                                <p className="text-sm text-slate-400 mt-2">Try relaxing your skill requirements to broaden the discovery pool.</p>
                            </motion.div>
                        ) : (
                            candidates.map((cand, idx) => (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    key={cand.id}
                                    className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-6 sm:p-8 hover:border-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/5 transition-all group relative overflow-hidden"
                                >
                                    <div className="flex flex-col md:flex-row gap-8">
                                        {/* Score Visual + Verified Certs Badge */}
                                        <div className="flex-shrink-0 flex flex-col items-center gap-4">
                                            <div className="relative w-24 h-24">
                                                <svg className="w-full h-full transform -rotate-90">
                                                    <circle className="text-slate-100 dark:text-slate-800" strokeWidth="6" stroke="currentColor" fill="transparent" r="40" cx="48" cy="48" />
                                                    <circle
                                                        className="text-blue-500 transition-all duration-1000"
                                                        strokeWidth="6"
                                                        strokeDasharray={2 * Math.PI * 40}
                                                        strokeDashoffset={2 * Math.PI * 40 * (1 - cand.matchScore / 100)}
                                                        strokeLinecap="round"
                                                        stroke="currentColor"
                                                        fill="transparent"
                                                        r="40" cx="48" cy="48"
                                                    />
                                                </svg>
                                                <div className="absolute inset-0 flex items-center justify-center flex-col">
                                                    <span className="text-xl font-black text-slate-900 dark:text-white leading-none">{cand.matchScore}%</span>
                                                </div>
                                            </div>
                                            <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Match Score</span>

                                            {cand.verifiedCertCount > 0 && (
                                                <div className="flex items-center gap-1.5 px-3 py-1 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl">
                                                    <GraduationCap size={12} className="text-purple-600 flex-shrink-0" />
                                                    <span className="text-[9px] font-black text-purple-600 uppercase tracking-wide leading-tight text-center">
                                                        {cand.verifiedCertCount} Verified Certs
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Candidate Details */}
                                        <div className="flex-1 space-y-4">
                                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                                <div className="space-y-1">
                                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                                                        {cand.anonymizedName}
                                                        <Badge label="Elite Seeker" variant="blue" />
                                                    </h3>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                                        <Target size={12} className="text-blue-500" /> Competency Highlights
                                                    </p>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        onClick={() => handleGenerateResume(cand.id)}
                                                        disabled={generatingResumeFor === cand.id}
                                                        className="h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-all flex items-center gap-2"
                                                    >
                                                        {generatingResumeFor === cand.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles size={14} />}
                                                        AI Resume
                                                    </button>
                                                    {cand.certCount > 0 && (
                                                        <button
                                                            onClick={() => handleViewQuals(cand.id)}
                                                            className="h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center gap-2"
                                                        >
                                                            View Qualifications
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => !invited.includes(cand.id) && handleInvite(cand.id)}
                                                        disabled={inviting === cand.id || invited.includes(cand.id)}
                                                        className={cn(
                                                            "h-10 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-sm active:scale-95",
                                                            invited.includes(cand.id)
                                                                ? "bg-green-100 text-green-700 cursor-default"
                                                                : "bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-blue-600 dark:hover:bg-blue-500 shadow-slate-900/20"
                                                        )}
                                                    >
                                                        {inviting === cand.id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : invited.includes(cand.id) ? (
                                                            <>Shortlisted <Check size={14} /></>
                                                        ) : (
                                                            <>Shortlist Candidate <ChevronRight size={14} /></>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>

                                            <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 italic font-medium">
                                                "{cand.bio || "No professional summary provided."}"
                                            </p>

                                            {cand.matchJustification && (
                                                <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/50 p-4 rounded-2xl">
                                                    <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                                                        <Sparkles size={12} /> AI Match Intelligence
                                                    </p>
                                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                                                        {cand.matchJustification}
                                                    </p>
                                                </div>
                                            )}

                                            <div className="flex flex-wrap gap-2 pt-2">
                                                {cand.matchedSkills?.map((s: string, i: number) => (
                                                    <span key={i} className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 text-[10px] font-bold rounded-lg border border-blue-100 dark:border-blue-800 flex items-center gap-1.5">
                                                        <Check size={12} /> {s}
                                                    </span>
                                                ))}
                                                {cand.missingSkills?.map((s: string, i: number) => (
                                                    <span key={i} className="px-3 py-1 bg-slate-50 dark:bg-slate-900/30 text-slate-400 text-[10px] font-bold rounded-lg border border-slate-100 dark:border-slate-800">
                                                        {s}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* ── Qualifications Modal ────────────────────────────────────────── */}
            <AnimatePresence>
                {viewingQualsFor && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                            onClick={() => setViewingQualsFor(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 p-8 m-auto max-h-[90vh] overflow-y-auto"
                        >
                            <button
                                onClick={() => setViewingQualsFor(null)}
                                className="absolute top-6 right-6 p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>

                            <div className="mb-8">
                                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center mb-4">
                                    <GraduationCap size={24} />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white">Academic Qualifications</h3>
                                <p className="text-sm font-medium text-slate-500 mt-1">
                                    {candidates.find(c => c.id === viewingQualsFor)?.anonymizedName}'s verified credentials
                                </p>
                            </div>

                            {loadingQuals ? (
                                <div className="py-12 flex justify-center">
                                    <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                                </div>
                            ) : qualsData.length === 0 ? (
                                <p className="text-center py-8 text-slate-500 font-medium">No certificates available.</p>
                            ) : (
                                <div className="space-y-4">
                                    {qualsData.map((cert) => (
                                        <div key={cert.id} className="p-5 border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                                            <div className="flex-1">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                                    <FileText size={12} /> Detected Title
                                                </p>
                                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                                    {cert.parsedQualification || <span className="italic text-slate-400">Title could not be extracted automatically</span>}
                                                </p>
                                            </div>
                                            <div className="flex-shrink-0 flex items-center gap-2">
                                                {cert.isNameVerified ? (
                                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-bold whitespace-nowrap">
                                                        <ShieldCheck size={14} /> Name Verified
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-xl text-xs font-bold whitespace-nowrap">
                                                        <AlertCircle size={14} /> Unverified
                                                    </div>
                                                )}
                                                <a
                                                    href={cert.url}
                                                    target="_blank"
                                                    className="p-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-100 transition-colors text-slate-600 dark:text-slate-300"
                                                    title="View Original Document"
                                                >
                                                    <Eye size={16} />
                                                </a>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ── AI Resume Modal ────────────────────────────────────────── */}
            <AnimatePresence>
                {generatingResumeFor && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                            onClick={() => setGeneratingResumeFor(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 p-8 md:p-10 m-auto max-h-[90vh] overflow-y-auto"
                        >
                            <button
                                onClick={() => setGeneratingResumeFor(null)}
                                className="absolute top-6 right-6 p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>

                            <div className="mb-8">
                                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-4">
                                    <Sparkles size={24} />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white">AI-Tailored Resume</h3>
                                <p className="text-sm font-medium text-slate-500 mt-1">
                                    Synthesized instantly for {candidates.find(c => c.id === generatingResumeFor)?.anonymizedName} based on your job requirements.
                                </p>
                            </div>

                            {!aiResumeData ? (
                                <div className="py-20 flex flex-col items-center justify-center gap-4">
                                    <motion.div
                                        animate={{ rotate: 360, scale: [1, 1.2, 1] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                        className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full shadow-2xl shadow-blue-500/20"
                                    />
                                    <p className="text-sm font-black text-slate-500 uppercase tracking-widest animate-pulse mt-4">
                                        Gemini is synthesizing the candidate's professional profile...
                                    </p>
                                </div>
                            ) : (
                                <div className="prose dark:prose-invert prose-sm md:prose-base max-w-none prose-headings:font-black prose-a:text-blue-600 prose-p:text-slate-600 dark:prose-p:text-slate-300">
                                    <ReactMarkdown>{aiResumeData}</ReactMarkdown>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
