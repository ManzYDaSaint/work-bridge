"use client";

import { AnimatePresence, motion } from "framer-motion";
import { 
  X, MapPin, Briefcase, GraduationCap, Bookmark, Mail, Phone, 
  Send, Loader2, FolderPlus 
} from "lucide-react";
import { Badge } from "../ui";
import { useEffect, useState, type MouseEvent } from "react";
import { toast } from "sonner";

interface CandidateExperience {
  role?: string;
  title?: string;
  company?: string;
  organization?: string;
  startDate?: string | null;
  endDate?: string | null;
  description?: string | null;
  start_date?: string | null;
  end_date?: string | null;
}

interface CandidateEducation {
  degree?: string;
  qualification?: string;
  institution?: string;
  school?: string;
  university?: string;
  startDate?: string | null;
  endDate?: string | null;
  description?: string | null;
  start_date?: string | null;
  end_date?: string | null;
}

interface CandidateCertificate {
  title?: string;
  certificate?: string;
  issuer?: string;
  issuing_organization?: string;
  issue_date?: string | null;
  issueDate?: string | null;
}

interface CandidateContact {
  email?: string;
  phone?: string;
  whatsapp?: boolean;
}

export interface ApplicantProfile {
  id: string;
  full_name: string;
  bio: string | null;
  location: string | null;
  avatar_url: string | null;
  skills: string[];
  experience: CandidateExperience[];
  education: CandidateEducation[];
  certificates: CandidateCertificate[];
  seniority_level: string | null;
  employment_type: string | null;
  employment_status: string | null;
  search_intent: string;
  qualification: string | null;
  contact: CandidateContact | null;
  isContactGated?: boolean;
  contactLimitReached?: boolean;
  profile_visibility?: string;
}

interface CandidateDetailDrawerProps {
  open: boolean;
  profile: ApplicantProfile | null;
  isSaved: boolean;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onToggleSave: (e: MouseEvent<HTMLButtonElement>) => void;
}

function formatDate(date?: string | null): string | null {
  if (!date) return null;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function formatDateRange(start?: string | null, end?: string | null) {
  const from = formatDate(start) || "Unknown";
  const to = end ? formatDate(end) || "Present" : "Present";
  return `${from} — ${to}`;
}

export default function CandidateDetailDrawer({
  open,
  profile,
  isSaved,
  loading,
  error,
  onClose,
  onToggleSave,
}: CandidateDetailDrawerProps) {
  const [jobs, setJobs] = useState<Array<{ id: string; title: string }>>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [inviting, setInviting] = useState(false);

  const [pools, setPools] = useState<Array<{ id: string; name: string; color_tag: string }>>([]);
  const [selectedPoolId, setSelectedPoolId] = useState<string>("");
  const [addingToPool, setAddingToPool] = useState(false);

  useEffect(() => {
    if (!open) return;

    const fetchActiveJobsAndPools = async () => {
      try {
        const [jobsRes, poolsRes] = await Promise.all([
          fetch("/api/employer/jobs"),
          fetch("/api/employer/talent-pools")
        ]);

        if (jobsRes.ok) {
          const jobsData = await jobsRes.json();
          setJobs(jobsData.jobs || []);
        }

        if (poolsRes.ok) {
          const poolsData = await poolsRes.json();
          setPools(poolsData.pools || []);
        }
      } catch (err) {
        console.error("Failed to fetch jobs/pools:", err);
      }
    };

    fetchActiveJobsAndPools();
  }, [open]);

  const handleInvite = async () => {
    if (!selectedJobId || !profile) {
      toast.error("Please select a job first.");
      return;
    }

    const selectedJob = jobs.find((job) => job.id === selectedJobId);
    if (!selectedJob) {
      toast.error("Selected job not found.");
      return;
    }

    setInviting(true);
    try {
      const response = await fetch("/api/employer/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: profile.id,
          jobId: selectedJob.id,
          companyName: "Our Company",
          jobTitle: selectedJob.title,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to send invite");
      }

      toast.success("Invitation sent!");
      setSelectedJobId("");
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setInviting(false);
    }
  };

  const handleAddToPool = async () => {
    if (!selectedPoolId || !profile) {
      toast.error("Please select a folder.");
      return;
    }

    setAddingToPool(true);
    try {
      const response = await fetch(`/api/employer/talent-pools/${selectedPoolId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seeker_id: profile.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add to pool.");
      }

      const poolObj = pools.find((p) => p.id === selectedPoolId);
      toast.success(`Added to ${poolObj?.name || 'Talent Pool'}`);
      setSelectedPoolId("");
    } catch (err: any) {
      toast.error(err.message || "Failed to add candidate");
    } finally {
      setAddingToPool(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Glassmorphic Minimalist Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md transition-opacity"
            onClick={onClose}
          />

          {/* Minimalist Slide-Over Sheet */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed right-0 top-0 z-[60] flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl dark:bg-slate-950 border-l border-stone-200/80 dark:border-slate-800"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Minimalist Sticky Header */}
            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-stone-100 bg-white/80 px-6 py-4 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/80">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white shadow-inner dark:bg-slate-100 dark:text-slate-900">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="h-full w-full rounded-full object-cover" />
                  ) : (
                    (profile?.full_name || "?")[0].toUpperCase()
                  )}
                </div>
                <div>
                  <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                    {profile?.full_name || "Candidate Profile"}
                  </h2>
                  {profile?.location && (
                    <p className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                      <MapPin size={12} className="opacity-70" />
                      {profile.location}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onToggleSave}
                  className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold transition-all ${
                    isSaved 
                      ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300"
                      : "border-stone-200 bg-white text-slate-700 hover:bg-stone-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                  }`}
                >
                  <Bookmark size={13} className={isSaved ? "fill-amber-500 text-amber-500" : ""} />
                  {isSaved ? "Saved" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-stone-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  aria-label="Close sheet"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Scrollable Main Sheet Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {loading ? (
                <div className="flex h-64 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              ) : error ? (
                <div className="rounded-xl border border-red-200/80 bg-red-50/50 p-4 text-xs font-medium text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
                  {error}
                </div>
              ) : profile ? (
                <>
                  {/* Status Pills */}
                  <div className="flex flex-wrap gap-2">
                    {profile.search_intent && (
                      <span className="inline-flex items-center rounded-full bg-sky-50 border border-sky-200/60 px-3 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-950/40 dark:border-sky-900/60 dark:text-sky-300">
                        {profile.search_intent.replace(/_/g, " ")}
                      </span>
                    )}
                    {profile.employment_status && (
                      <span className="inline-flex items-center rounded-full bg-stone-100 border border-stone-200/80 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
                        {profile.employment_status.replace(/_/g, " ")}
                      </span>
                    )}
                    {profile.seniority_level && (
                      <span className="inline-flex items-center rounded-full bg-stone-100 border border-stone-200/80 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
                        {profile.seniority_level}
                      </span>
                    )}
                  </div>

                  {/* Integrated Quick Action Dock (Invite & Talent Pool) */}
                  <div className="rounded-2xl border border-stone-200/70 bg-stone-50/80 p-4 dark:border-slate-800/80 dark:bg-slate-900/50">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
                      Recruiter Actions
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Invite to Apply */}
                      <div className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white p-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                        <select
                          className="flex-1 bg-transparent px-2 text-xs font-medium text-slate-800 outline-none dark:text-white"
                          value={selectedJobId}
                          onChange={(e) => setSelectedJobId(e.target.value)}
                        >
                          <option value="">Invite to job...</option>
                          {jobs.map((j) => (
                            <option key={j.id} value={j.id}>{j.title}</option>
                          ))}
                        </select>
                        <button
                          onClick={handleInvite}
                          disabled={inviting}
                          className="flex h-8 items-center gap-1.5 rounded-lg bg-[#16324f] px-3 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                          {inviting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                          Invite
                        </button>
                      </div>

                      {/* Add to Talent Pool Folder */}
                      <div className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white p-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                        <select
                          className="flex-1 bg-transparent px-2 text-xs font-medium text-slate-800 outline-none dark:text-white"
                          value={selectedPoolId}
                          onChange={(e) => setSelectedPoolId(e.target.value)}
                        >
                          <option value="">Add to pool...</option>
                          {pools.map((p) => (
                            <option key={p.id} value={p.id}>📁 {p.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={handleAddToPool}
                          disabled={addingToPool}
                          className="flex h-8 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                          {addingToPool ? <Loader2 size={13} className="animate-spin" /> : <FolderPlus size={13} />}
                          Add
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Summary / Bio */}
                  {profile.bio && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">About</h3>
                      <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                        {profile.bio}
                      </p>
                    </div>
                  )}

                  {/* Skills Pills */}
                  {profile.skills?.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Skills</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {profile.skills.map((skill, i) => (
                          <span key={i} className="rounded-md bg-stone-100 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Experience Timeline */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      <Briefcase size={14} />
                      Experience
                    </div>
                    {profile.experience?.length ? (
                      <div className="space-y-3 pl-2 border-l border-stone-200 dark:border-slate-800">
                        {profile.experience.map((item, i) => (
                          <div key={i} className="relative pl-4">
                            <div className="absolute -left-[13px] top-1 h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-600" />
                            <p className="text-xs font-bold text-slate-900 dark:text-white">{item.role || item.title || "Role"}</p>
                            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{item.company || item.organization}</p>
                            <p className="text-[10px] text-slate-400">{formatDateRange(item.startDate || item.start_date, item.endDate || item.end_date)}</p>
                            {item.description && <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{item.description}</p>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No experience records listed.</p>
                    )}
                  </div>

                  {/* Education Timeline */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      <GraduationCap size={14} />
                      Education
                    </div>
                    {profile.education?.length ? (
                      <div className="space-y-3 pl-2 border-l border-stone-200 dark:border-slate-800">
                        {profile.education.map((item, i) => (
                          <div key={i} className="relative pl-4">
                            <div className="absolute -left-[13px] top-1 h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-600" />
                            <p className="text-xs font-bold text-slate-900 dark:text-white">{item.degree || item.qualification || "Qualification"}</p>
                            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{item.institution || item.school || item.university}</p>
                            <p className="text-[10px] text-slate-400">{formatDateRange(item.startDate || item.start_date, item.endDate || item.end_date)}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No education records listed.</p>
                    )}
                  </div>

                  {/* Contact Layer */}
                  <div className="pt-2 border-t border-stone-100 dark:border-slate-800">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                      Direct Contact
                    </p>
                    {profile.contact ? (
                      <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                        {profile.contact.email && (
                          <span className="flex items-center gap-1.5"><Mail size={13} className="text-slate-400" /> {profile.contact.email}</span>
                        )}
                        {profile.contact.phone && (
                          <span className="flex items-center gap-1.5"><Phone size={13} className="text-slate-400" /> {profile.contact.phone}</span>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">
                        {profile.isContactGated ? "Contact details are gated." : "Contact not available."}
                      </p>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
