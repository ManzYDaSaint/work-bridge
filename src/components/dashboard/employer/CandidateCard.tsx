"use client";

import { Badge, CompanyAvatar } from "@/components/dashboard/ui";
import { CheckCircle, Loader2, Mail, MapPin, XCircle, Calendar, Sparkles } from "lucide-react";

interface JobSeekerProfile {
    id?: string;
    full_name: string;
    location?: string;
    phone?: string;
    whatsapp?: boolean;
    skills?: string[];
    bio?: string;
}

interface JobDetails {
    id?: string;
    title: string;
}

interface ApplicationData {
    id: string;
    status: "PENDING" | "ACCEPTED" | "REJECTED" | "SHORTLISTED" | "INTERVIEWING";
    screeningScore?: number;
    similarity?: number;
    meetsRequiredCriteria?: boolean;
    screeningSummary?: string;
    matchedSkills?: string[];
    missingSkills?: string[];
    user: {
        email: string;
        jobSeeker: JobSeekerProfile;
    };
    job: JobDetails;
}

interface CandidateCardProps {
    application: ApplicationData;
    onViewProfile: () => void;
    onStatusUpdate: (status: "SHORTLISTED" | "REJECTED" | "INTERVIEWING" | "ACCEPTED", interviewLink?: string) => void;
    updating?: boolean;
}

export default function CandidateCard({ application, onViewProfile, onStatusUpdate, updating }: CandidateCardProps) {
    const app = application;
    const seeker = app.user?.jobSeeker;

    return (
        <div className="group rounded-3xl border border-stone-200/80 bg-white p-5 shadow-xs transition-all duration-200 hover:border-stone-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 space-y-3.5">
            <div className="flex items-start justify-between gap-3">
                <button type="button" onClick={onViewProfile} className="flex min-w-0 flex-1 items-start gap-3 text-left">
                    <CompanyAvatar logoUrl={null} name={seeker?.full_name || "?"} size="sm" />
                    <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#16324f] dark:group-hover:text-amber-400 transition-colors">
                            {seeker?.full_name || "Anonymous Seeker"}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 truncate">
                            <Mail size={11} className="shrink-0" />
                            <span className="truncate">{app.user?.email}</span>
                        </p>
                        {seeker?.location && (
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 truncate">
                                <MapPin size={11} className="shrink-0" />
                                <span className="truncate">{seeker.location}</span>
                            </p>
                        )}
                    </div>
                </button>
                <Badge label={app.status} variant={app.status === "SHORTLISTED" || app.status === "ACCEPTED" || app.status === "INTERVIEWING" ? "green" : app.status === "REJECTED" ? "red" : "yellow"} />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <Badge label={app.job?.title || "Role"} variant="outline" />
                {app.similarity !== undefined ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/40">
                        <Sparkles size={11} /> {Math.round(app.similarity * 100)}% Match
                    </span>
                ) : app.screeningScore !== undefined && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-bold text-sky-700 dark:bg-sky-950/50 dark:text-sky-400 border border-sky-200/50 dark:border-sky-900/40">
                        {app.screeningScore}% Score
                    </span>
                )}
                {app.meetsRequiredCriteria !== undefined && (
                    <Badge 
                        label={app.meetsRequiredCriteria ? "Meets Criteria" : "Criteria Gap"} 
                        variant={app.meetsRequiredCriteria ? "green" : "yellow"} 
                    />
                )}
                {seeker?.skills?.slice(0, 3).map((skill) => (
                    <Badge key={skill} label={skill} variant="secondary" />
                ))}
            </div>

            {seeker?.bio && <p className="line-clamp-2 text-xs text-slate-600 leading-relaxed dark:text-slate-300">{seeker.bio}</p>}

            {app.screeningSummary && (
                <div className="rounded-2xl border border-amber-200/60 bg-amber-50/50 p-2.5 text-[11px] leading-relaxed text-amber-900 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-200">
                    <p className="font-bold mb-0.5 flex items-center gap-1">
                        <Sparkles size={11} className="text-amber-600 dark:text-amber-400" /> Match Justification:
                    </p>
                    <p className="italic line-clamp-2">"{app.screeningSummary}"</p>
                </div>
            )}

            <div className="flex items-center justify-between border-t border-stone-100 pt-3 dark:border-slate-800">
                <button type="button" onClick={onViewProfile} className="text-xs font-bold text-[#16324f] hover:underline dark:text-amber-400">
                    Open Profile →
                </button>
                {updating ? (
                    <Loader2 size={16} className="animate-spin text-[#16324f] dark:text-amber-400" />
                ) : (
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => {
                                const link = window.prompt("Enter Interview Link (e.g. Calendly, Google Meet, Zoom) or leave blank:");
                                onStatusUpdate("INTERVIEWING", link || undefined);
                            }}
                            disabled={app.status === "INTERVIEWING"}
                            className="rounded-xl border border-stone-200 p-1.5 text-slate-500 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-600 disabled:opacity-40 dark:border-slate-800 dark:text-slate-400 dark:hover:border-sky-900 dark:hover:bg-sky-950/40 dark:hover:text-sky-400 transition"
                            title="Invite to Interview"
                        >
                            <Calendar size={15} />
                        </button>
                        <button
                            type="button"
                            onClick={() => onStatusUpdate("SHORTLISTED")}
                            disabled={app.status === "SHORTLISTED"}
                            className="rounded-xl border border-stone-200 p-1.5 text-slate-500 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-40 dark:border-slate-800 dark:text-slate-400 dark:hover:border-emerald-900 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-400 transition"
                            title="Shortlist"
                        >
                            <CheckCircle size={15} />
                        </button>
                        <button
                            type="button"
                            onClick={() => onStatusUpdate("REJECTED")}
                            disabled={app.status === "REJECTED"}
                            className="rounded-xl border border-stone-200 p-1.5 text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40 dark:border-slate-800 dark:text-slate-400 dark:hover:border-rose-900 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition"
                            title="Reject"
                        >
                            <XCircle size={15} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
