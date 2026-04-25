"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch, apiFetchJson } from "@/lib/api";
import { Loader2, MapPin, Briefcase, GraduationCap, ChevronLeft, Award, ExternalLink, Mail, Phone, MessageSquare, Bookmark, BookmarkMinus, Send } from "lucide-react";
import { Badge, SectionCard } from "@/components/dashboard/ui";
import { toast } from "sonner";

interface PublicProfile {
    id: string;
    full_name: string;
    bio: string | null;
    location: string | null;
    avatar_url: string | null;
    skills: string[];
    experience: any[];
    education: any[];
    certificates: any[];
    portfolio_links: string[];
    seniority_level: string | null;
    employment_type: string | null;
    search_intent: string;
    qualification: string | null;
    contact: {
        email?: string;
        phone?: string;
        whatsapp?: boolean;
    } | null;
    isContactGated?: boolean;
}

export default function TalentProfilePage() {
    const params = useParams();
    const router = useRouter();
    const [profile, setProfile] = useState<PublicProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSaved, setIsSaved] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [employerJobs, setEmployerJobs] = useState<{id: string; title: string}[]>([]);
    const [selectedJobId, setSelectedJobId] = useState("");
    const [inviteMessage, setInviteMessage] = useState("");
    const [sendingInvite, setSendingInvite] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await apiFetch(`/api/employer/discover/${params.id}`);
                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || "Profile not found");
                }
                const data = await res.json();
                setProfile(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        const checkSaved = async () => {
            try {
                const res = await apiFetch(`/api/employer/talent/${params.id}/save`);
                if (res.ok) {
                    const data = await res.json();
                    setIsSaved(data.isSaved);
                }
            } catch (e) {}
        };

        fetchProfile();
        checkSaved();
    }, [params.id]);

    const fetchEmployerJobs = async () => {
        try {
            const res = await apiFetch("/api/employer/jobs?status=ACTIVE");
            if (res.ok) {
                const data = await res.json();
                setEmployerJobs(data.jobs || []);
            }
        } catch (e) {}
    };

    const handleOpenInvite = () => {
        fetchEmployerJobs();
        setShowInviteModal(true);
    };

    const handleSendInvite = async () => {
        setSendingInvite(true);
        try {
            await apiFetchJson("/api/employer/messages/invite", {
                method: "POST",
                body: JSON.stringify({
                    seeker_id: params.id,
                    job_id: selectedJobId || undefined,
                    message: inviteMessage || undefined,
                })
            });
            toast.success("Invite sent successfully!");
            setShowInviteModal(false);
            setInviteMessage("");
            setSelectedJobId("");
        } catch (error: any) {
            toast.error(error.message || "Failed to send invite");
        } finally {
            setSendingInvite(false);
        }
    };

    if (loading) {
        return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#16324f]" /></div>;
    }

    if (error || !profile) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4">
                <p className="text-slate-500 dark:text-slate-400">{error || "Profile not found"}</p>
                <button onClick={() => router.back()} className="text-sm font-semibold text-[#16324f] hover:underline dark:text-slate-200">
                    Go back
                </button>
            </div>
        );
    }

    const formatIntent = (intent: string) => {
        switch (intent) {
            case "ACTIVELY_LOOKING": return "Actively Looking";
            case "OPEN_TO_OFFERS": return "Open to Offers";
            case "SEEKING_INTERNSHIP": return "Seeking Internship";
            default: return "Unknown Intent";
        }
    };

    const toggleSave = async () => {
        setSaving(true);
        try {
            if (isSaved) {
                await apiFetch(`/api/employer/talent/${params.id}/save`, { method: "DELETE" });
                setIsSaved(false);
                toast.success("Removed from saved candidates");
            } else {
                await apiFetch(`/api/employer/talent/${params.id}/save`, { method: "POST" });
                setIsSaved(true);
                toast.success("Saved to your candidates");
            }
        } catch (error) {
            toast.error("Failed to update status");
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <div className="mx-auto max-w-4xl space-y-6 pb-20 pt-6">
                <button onClick={() => router.back()} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200">
                <ChevronLeft size={16} /> Back to Discover
            </button>

            {/* Header Profile Card */}
            <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-8">
                <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
                    <div className="flex items-center gap-5">
                        <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-stone-100 dark:bg-slate-800 md:h-24 md:w-24">
                            {profile.avatar_url ? (
                                <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                            ) : (
                                <span className="text-3xl font-semibold text-[#16324f] dark:text-slate-300">
                                    {(profile.full_name || "?")[0].toUpperCase()}
                                </span>
                            )}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white md:text-3xl">
                                {profile.full_name}
                            </h1>
                            {profile.location && (
                                <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-slate-400">
                                    <MapPin size={14} />
                                    {profile.location}
                                </p>
                            )}
                            <div className="mt-3 flex flex-wrap gap-2">
                                <Badge label={formatIntent(profile.search_intent)} variant={profile.search_intent === "SEEKING_INTERNSHIP" ? "yellow" : "blue"} />
                                {profile.seniority_level && <Badge label={profile.seniority_level} variant="secondary" />}
                                {profile.employment_type && <Badge label={profile.employment_type} variant="secondary" />}
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-shrink-0 flex-wrap gap-2">
                        <button 
                            onClick={toggleSave}
                            disabled={saving}
                            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
                                isSaved 
                                    ? "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300" 
                                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                            }`}
                        >
                            {isSaved ? <><BookmarkMinus size={16} /> Saved</> : <><Bookmark size={16} /> Save</>}
                        </button>
                        <button 
                            onClick={handleOpenInvite}
                            className="inline-flex items-center gap-2 rounded-xl bg-[#16324f] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
                        >
                            <Send size={16} /> Invite to Apply
                        </button>
                    </div>
                </div>

                {profile.bio && (
                    <div className="mt-8 border-t border-stone-200 pt-6 dark:border-slate-800">
                        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">About</h3>
                        <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{profile.bio}</p>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div className="space-y-6 md:col-span-2">
                    <SectionCard title="Experience">
                        {profile.experience?.length > 0 ? (
                            <div className="divide-y divide-stone-200 dark:divide-slate-800">
                                {profile.experience.map((exp, i) => (
                                    <div key={i} className="p-6">
                                        <div className="flex items-start gap-4">
                                            <div className="mt-1 rounded-full bg-stone-100 p-2 dark:bg-slate-800">
                                                <Briefcase size={16} className="text-slate-600 dark:text-slate-400" />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-semibold text-slate-900 dark:text-white">{exp.role}</h4>
                                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{exp.company}</p>
                                                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                                    {new Date(exp.startDate).getFullYear()} - {exp.endDate ? new Date(exp.endDate).getFullYear() : 'Present'}
                                                </p>
                                                <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{exp.description}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="p-6 text-sm text-slate-500">No experience listed.</p>
                        )}
                    </SectionCard>

                    <SectionCard title="Education">
                        {profile.education?.length > 0 ? (
                            <div className="divide-y divide-stone-200 dark:divide-slate-800">
                                {profile.education.map((edu, i) => (
                                    <div key={i} className="p-6">
                                        <div className="flex items-start gap-4">
                                            <div className="mt-1 rounded-full bg-stone-100 p-2 dark:bg-slate-800">
                                                <GraduationCap size={16} className="text-slate-600 dark:text-slate-400" />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-semibold text-slate-900 dark:text-white">{edu.certificate}</h4>
                                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{edu.institution}</p>
                                                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                                    {new Date(edu.startDate).getFullYear()} - {edu.endDate ? new Date(edu.endDate).getFullYear() : 'Present'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="p-6 text-sm text-slate-500">No education listed.</p>
                        )}
                    </SectionCard>

                    <SectionCard title="Certifications">
                        {profile.certificates?.length > 0 ? (
                            <div className="divide-y divide-stone-200 dark:divide-slate-800">
                                {profile.certificates.map((cert) => (
                                    <div key={cert.id} className="p-6">
                                        <div className="flex items-start gap-4">
                                            <div className="mt-1 rounded-full bg-stone-100 p-2 dark:bg-slate-800">
                                                <Award size={16} className="text-slate-600 dark:text-slate-400" />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-semibold text-slate-900 dark:text-white">{cert.title}</h4>
                                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{cert.issuer}</p>
                                                {cert.issue_date && (
                                                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Issued {new Date(cert.issue_date).getFullYear()}</p>
                                                )}
                                                {cert.credential_url && (
                                                    <a href={cert.credential_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400">
                                                        View Credential <ExternalLink size={12} />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="p-6 text-sm text-slate-500">No certifications listed.</p>
                        )}
                    </SectionCard>
                </div>

                <div className="space-y-6">
                    {profile.isContactGated ? (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center dark:border-amber-900/50 dark:bg-amber-950/20">
                            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-amber-200 dark:bg-amber-900/50">
                                <Award size={18} className="text-amber-700 dark:text-amber-400" />
                            </div>
                            <h4 className="font-semibold text-slate-900 dark:text-white">Premium Feature</h4>
                            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Upgrade to Employer Premium to unlock direct candidate contact info and headhunt straight from the database.</p>
                            <a href="/dashboard/employer/billing" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700">
                                Upgrade Plan
                            </a>
                        </div>
                    ) : profile.contact ? (
                        <SectionCard title="Contact Candidate">
                            <div className="space-y-4 p-5">
                                {profile.contact.email && (
                                    <div className="flex items-center gap-3">
                                        <div className="rounded-full bg-stone-100 p-2 text-slate-600 dark:bg-slate-800 dark:text-slate-400"><Mail size={16} /></div>
                                        <a href={`mailto:${profile.contact.email}`} className="text-sm font-medium text-slate-900 hover:underline dark:text-white truncate">{profile.contact.email}</a>
                                    </div>
                                )}
                                {profile.contact.phone && (
                                    <div className="flex items-center gap-3">
                                        <div className="rounded-full bg-stone-100 p-2 text-slate-600 dark:bg-slate-800 dark:text-slate-400"><Phone size={16} /></div>
                                        <a href={`tel:${profile.contact.phone}`} className="text-sm font-medium text-slate-900 hover:underline dark:text-white">{profile.contact.phone}</a>
                                    </div>
                                )}
                                {profile.contact.whatsapp && profile.contact.phone && (
                                    <a href={`https://wa.me/${profile.contact.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1ebd5b]">
                                        <MessageSquare size={16} /> Message on WhatsApp
                                    </a>
                                )}
                            </div>
                        </SectionCard>
                    ) : (
                        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5 text-center dark:border-slate-800 dark:bg-slate-900">
                            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-stone-200 dark:bg-slate-800">
                                <Mail size={18} className="text-slate-500 dark:text-slate-400" />
                            </div>
                            <h4 className="font-semibold text-slate-900 dark:text-white">Anonymous Candidate</h4>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">This candidate has hidden their contact information. You can reach out to them directly if they apply to one of your roles.</p>
                        </div>
                    )}

                    <SectionCard title="Skills">
                        <div className="p-5">
                            {profile.skills?.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {profile.skills.map((skill, i) => (
                                        <span key={i} className="rounded-lg bg-stone-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500">No skills listed.</p>
                            )}
                        </div>
                    </SectionCard>

                    {profile.portfolio_links?.length > 0 && (
                        <SectionCard title="Portfolio & Links">
                            <div className="space-y-3 p-5">
                                {profile.portfolio_links.map((link, i) => (
                                    <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-3 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-stone-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600">
                                        <span className="truncate">{link.replace(/^https?:\/\//, '')}</span>
                                        <ExternalLink size={14} className="flex-shrink-0 text-slate-400" />
                                    </a>
                                ))}
                            </div>
                        </SectionCard>
                    )}
                </div>
            </div>
        </div>

        {/* Invite to Apply Modal */}
        {showInviteModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="w-full max-w-lg rounded-3xl border border-stone-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
                    <div className="border-b border-stone-200 p-6 dark:border-slate-800">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Invite to Apply</h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Send a direct message to {profile.full_name} inviting them to apply.
                        </p>
                    </div>
                    <div className="space-y-4 p-6">
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                For which role? (optional)
                            </label>
                            <select
                                value={selectedJobId}
                                onChange={e => setSelectedJobId(e.target.value)}
                                className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                            >
                                <option value="">-- General invite --</option>
                                {employerJobs.map(job => (
                                    <option key={job.id} value={job.id}>{job.title}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                Custom message (optional)
                            </label>
                            <textarea
                                value={inviteMessage}
                                onChange={e => setInviteMessage(e.target.value)}
                                rows={4}
                                placeholder="Leave blank to send the default invite message..."
                                className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white resize-none"
                            />
                        </div>
                    </div>
                    <div className="flex items-center justify-end gap-3 border-t border-stone-200 p-6 dark:border-slate-800">
                        <button
                            onClick={() => setShowInviteModal(false)}
                            className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-stone-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSendInvite}
                            disabled={sendingInvite}
                            className="inline-flex items-center gap-2 rounded-xl bg-[#16324f] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                        >
                            {sendingInvite ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                            Send Invite
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
}
