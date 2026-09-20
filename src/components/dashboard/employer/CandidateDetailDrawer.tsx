"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  MapPin,
  Briefcase,
  GraduationCap,
  Bookmark,
  Mail,
  Phone,
  Send,
  Loader2,
  FolderPlus,
  MessageCircle,
  Trash2,
  ChevronDown,
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
  /** Optional: called when employer removes this candidate from the current pool */
  onRemoveFromPool?: () => void;
  /** Optional: show remove-from-pool button when viewing from inside a pool */
  showRemoveFromPool?: boolean;
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
  onRemoveFromPool,
  showRemoveFromPool = false,
}: CandidateDetailDrawerProps) {
  const [jobs, setJobs] = useState<Array<{ id: string; title: string }>>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [inviting, setInviting] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  const [pools, setPools] = useState<Array<{ id: string; name: string; color_tag: string }>>([]);
  const [selectedPoolId, setSelectedPoolId] = useState<string>("");
  const [addingToPool, setAddingToPool] = useState(false);
  const [poolOpen, setPoolOpen] = useState(false);

  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (!open) return;

    const fetchActiveJobsAndPools = async () => {
      try {
        const [jobsRes, poolsRes] = await Promise.all([
          fetch("/api/employer/jobs"),
          fetch("/api/employer/talent-pools"),
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

  // Reset dropdowns when drawer closes
  useEffect(() => {
    if (!open) {
      setSelectedJobId("");
      setSelectedPoolId("");
      setInviteOpen(false);
      setPoolOpen(false);
    }
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
      setInviteOpen(false);
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
      toast.success(`Added to ${poolObj?.name || "Talent Pool"}`);
      setSelectedPoolId("");
      setPoolOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to add candidate");
    } finally {
      setAddingToPool(false);
    }
  };

  const handleRemove = async () => {
    if (!onRemoveFromPool) return;
    setRemoving(true);
    try {
      await onRemoveFromPool();
      onClose();
    } finally {
      setRemoving(false);
    }
  };

  const phone = profile?.contact?.phone;
  const email = profile?.contact?.email;
  const hasWhatsApp = profile?.contact?.whatsapp;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md transition-opacity"
            onClick={onClose}
          />

          {/* Drawer Sheet */}
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
            {/* ── Sticky Header ── */}
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
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* ── Scrollable Profile Body ── */}
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

                  {/* Bio */}
                  {profile.bio && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">About</h3>
                      <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                        {profile.bio}
                      </p>
                    </div>
                  )}

                  {/* Skills */}
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

                  {/* Experience */}
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

                  {/* Education */}
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

                  {/* Spacer so footer doesn't cover content */}
                  <div className="h-4" />
                </>
              ) : null}
            </div>

            {/* ── Sticky Action Footer ── */}
            {profile && !loading && !error && (
              <div className="shrink-0 border-t border-stone-200 bg-white dark:border-slate-800 dark:bg-slate-950 px-5 py-4 space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Actions
                </p>

                <div className="grid grid-cols-1 gap-2">
                  {/* ── Invite to Job ── */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setInviteOpen((v) => !v)}
                      className="w-full flex items-center justify-between rounded-xl bg-[#16324f] px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                    >
                      <span className="flex items-center gap-2">
                        <Send size={15} />
                        Invite to a Job
                      </span>
                      <ChevronDown size={15} className={`transition-transform ${inviteOpen ? "rotate-180" : ""}`} />
                    </button>

                    {inviteOpen && (
                      <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 p-2 dark:border-slate-800 dark:bg-slate-900">
                        <select
                          className="flex-1 rounded-lg bg-white border border-stone-200 px-3 py-2 text-xs font-medium text-slate-800 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                          value={selectedJobId}
                          onChange={(e) => setSelectedJobId(e.target.value)}
                        >
                          <option value="">Select active job...</option>
                          {jobs.length === 0 && (
                            <option disabled>No active jobs found</option>
                          )}
                          {jobs.map((j) => (
                            <option key={j.id} value={j.id}>{j.title}</option>
                          ))}
                        </select>
                        <button
                          onClick={handleInvite}
                          disabled={inviting || !selectedJobId}
                          className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-[#16324f] px-4 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                        >
                          {inviting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                          Send
                        </button>
                      </div>
                    )}
                  </div>

                  {/* ── Direct Contact Row ── */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Email */}
                    {email ? (
                      <a
                        href={`mailto:${email}`}
                        className="flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-stone-50 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-stone-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <Mail size={14} />
                        Email
                      </a>
                    ) : (
                      <button
                        disabled
                        title="Email not available"
                        className="flex items-center justify-center gap-2 rounded-xl border border-stone-100 bg-stone-50/50 py-2.5 text-xs font-semibold text-slate-300 cursor-not-allowed dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-600"
                      >
                        <Mail size={14} />
                        Email
                      </button>
                    )}

                    {/* WhatsApp / Phone */}
                    {phone ? (
                      <a
                        href={hasWhatsApp ? `https://wa.me/${phone.replace(/\D/g, "")}` : `tel:${phone}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 py-2.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
                      >
                        <MessageCircle size={14} />
                        {hasWhatsApp ? "WhatsApp" : "Call"}
                      </a>
                    ) : (
                      <button
                        disabled
                        title="Phone not available"
                        className="flex items-center justify-center gap-2 rounded-xl border border-stone-100 bg-stone-50/50 py-2.5 text-xs font-semibold text-slate-300 cursor-not-allowed dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-600"
                      >
                        <MessageCircle size={14} />
                        WhatsApp
                      </button>
                    )}
                  </div>

                  {/* ── Add to Pool ── */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setPoolOpen((v) => !v)}
                      className="w-full flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-stone-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                    >
                      <span className="flex items-center gap-2">
                        <FolderPlus size={14} />
                        Add to Talent Pool
                      </span>
                      <ChevronDown size={13} className={`transition-transform ${poolOpen ? "rotate-180" : ""}`} />
                    </button>

                    {poolOpen && (
                      <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 p-2 dark:border-slate-800 dark:bg-slate-900">
                        <select
                          className="flex-1 rounded-lg bg-white border border-stone-200 px-3 py-2 text-xs font-medium text-slate-800 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                          value={selectedPoolId}
                          onChange={(e) => setSelectedPoolId(e.target.value)}
                        >
                          <option value="">Select folder...</option>
                          {pools.length === 0 && (
                            <option disabled>No pools created yet</option>
                          )}
                          {pools.map((p) => (
                            <option key={p.id} value={p.id}>📁 {p.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={handleAddToPool}
                          disabled={addingToPool || !selectedPoolId}
                          className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                        >
                          {addingToPool ? <Loader2 size={13} className="animate-spin" /> : <FolderPlus size={13} />}
                          Add
                        </button>
                      </div>
                    )}
                  </div>

                  {/* ── Remove from Pool (only when inside a pool) ── */}
                  {showRemoveFromPool && onRemoveFromPool && (
                    <button
                      type="button"
                      onClick={handleRemove}
                      disabled={removing}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-2.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/40"
                    >
                      {removing ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      Remove from this Pool
                    </button>
                  )}
                </div>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
