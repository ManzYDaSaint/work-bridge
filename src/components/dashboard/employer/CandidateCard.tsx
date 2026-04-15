"use client";

import { Badge, CompanyAvatar } from "@/components/dashboard/ui";
import { CheckCircle, Loader2, Mail, MapPin, XCircle } from "lucide-react";

interface JobSeekerProfile {
    id: string;
    full_name: string;
    location?: string;
    location?: string;
    phone?: string;
    whatsapp?: boolean;
    skills?: string[];
    bio?: string;
}

interface JobDetails {
    id: string;
    title: string;
}

interface ApplicationData {
    id: string;
    status: "PENDING" | "ACCEPTED" | "REJECTED" | "SHORTLISTED" | "INTERVIEWING";
    screeningScore?: number;
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
    onStatusUpdate: (status: "SHORTLISTED" | "REJECTED" | "INTERVIEWING" | "ACCEPTED") => void;
    updating?: boolean;
}

export default function CandidateCard({ application, onViewProfile, onStatusUpdate, updating }: CandidateCardProps) {
    const app = application;
    const seeker = app.user?.jobSeeker;

    return (
        <div className="rounded-2xl border border-stone-200 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-900/70">
            <div className="flex items-start justify-between gap-4">
                <button type="button" onClick={onViewProfile} className="flex min-w-0 flex-1 items-start gap-3 text-left">
                    <CompanyAvatar logoUrl={null} name={seeker?.full_name || "?"} size="sm" />
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{seeker?.full_name || "Anonymous seeker"}</p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                            <Mail size={12} />
                            <span className="truncate">{app.user?.email}</span>
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                            <MapPin size={12} />
                            {seeker?.location || "Location not set"}
                        </p>
                    </div>
                </button>
                <Badge label={app.status} variant={app.status === "SHORTLISTED" || app.status === "ACCEPTED" || app.status === "INTERVIEWING" ? "green" : app.status === "REJECTED" ? "red" : "yellow"} />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
                <Badge label={app.job?.title || "Role"} variant="outline" />
                {app.screeningScore !== undefined && <Badge label={`${app.screeningScore}% fit`} variant="blue" />}
                {app.meetsRequiredCriteria !== undefined && (
                    <Badge label={app.meetsRequiredCriteria ? "Meets requirements" : "Missing requirements"} variant={app.meetsRequiredCriteria ? "green" : "yellow"} />
                )}
                {seeker?.skills?.slice(0, 3).map((skill) => (
                    <Badge key={skill} label={skill} variant="secondary" />
                ))}
            </div>

            {seeker?.bio && <p className="mt-4 line-clamp-3 text-sm text-slate-600 dark:text-slate-400">{seeker.bio}</p>}
            {app.screeningSummary && <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{app.screeningSummary}</p>}

            <div className="mt-5 flex items-center justify-between border-t border-stone-200/70 pt-4 dark:border-slate-800">
                <button type="button" onClick={onViewProfile} className="text-sm font-semibold text-[#16324f] hover:underline dark:text-slate-200">
                    Open profile
                </button>
                {updating ? (
                    <Loader2 size={18} className="animate-spin text-[#16324f]" />
                ) : (
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => onStatusUpdate("SHORTLISTED")}
                            disabled={app.status === "SHORTLISTED"}
                            className="rounded-xl border border-stone-200 p-2 text-slate-500 hover:text-emerald-600 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
                        >
                            <CheckCircle size={16} />
                        </button>
                        <button
                            type="button"
                            onClick={() => onStatusUpdate("REJECTED")}
                            disabled={app.status === "REJECTED"}
                            className="rounded-xl border border-stone-200 p-2 text-slate-500 hover:text-red-600 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
                        >
                            <XCircle size={16} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
