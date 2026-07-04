"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X, MapPin, Briefcase, GraduationCap, Bookmark, Mail, Phone, Globe, Send, Loader2 } from "lucide-react";
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
  portfolio_links: string[];
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

  useEffect(() => {
    if (!open) return;

    const fetchActiveJobs = async () => {
      try {
        const response = await fetch("/api/employer/jobs");
        if (!response.ok) return;
        const data = await response.json();
        setJobs(data.jobs || []);
      } catch (err) {
        console.error("Failed to fetch jobs for invite:", err);
      }
    };

    fetchActiveJobs();
  }, [open]);

  const handleInvite = async () => {
    if (!selectedJobId || !profile) {
      toast.error("Please select a job to invite the candidate to.");
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

      toast.success("Invitation sent successfully!");
      setSelectedJobId("");
    } catch (err: any) {
      toast.error(err.message || "An error occurred while sending the invite");
    } finally {
      setInviting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            className="fixed right-0 top-0 z-[60] flex h-full w-full max-w-3xl flex-col overflow-y-auto bg-white shadow-2xl dark:bg-slate-950"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 border-b border-stone-200 bg-white/95 px-6 py-5 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Talent profile</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                    {profile?.full_name || "Candidate details"}
                  </h2>
                  {profile?.location && (
                    <p className="mt-2 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                      <MapPin size={14} />
                      {profile.location}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-stone-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  aria-label="Close candidate details"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {profile?.search_intent && (
                  <Badge
                    label={
                      profile.search_intent === "SEEKING_INTERNSHIP"
                        ? "Seeking Internship"
                        : profile.search_intent.replace(/_/g, " ")
                    }
                    variant="blue"
                  />
                )}
                {profile?.employment_status && (
                  <Badge label={profile.employment_status.replace(/_/g, " ")} variant="secondary" />
                )}
                {profile?.seniority_level && <Badge label={profile.seniority_level} variant="secondary" />}
                {profile?.employment_type && <Badge label={profile.employment_type} variant="secondary" />}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              {loading ? (
                <div className="flex h-full min-h-[20rem] items-center justify-center">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700 dark:border-slate-700 dark:border-t-white" />
                </div>
              ) : error ? (
                <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
                  {error}
                </div>
              ) : profile ? (
                <div className="space-y-6">
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
                    <div className="space-y-4 rounded-3xl border border-stone-200 bg-stone-50 p-5 dark:border-slate-800 dark:bg-slate-900/70">
                      <div>
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Invite to Apply</h3>
                        <p className="mt-1 text-xs text-slate-400">Send a direct invitation to this candidate.</p>
                        <div className="mt-4 flex gap-2">
                          <select
                            className="flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                            value={selectedJobId}
                            onChange={(e) => setSelectedJobId(e.target.value)}
                          >
                            <option value="">Select a job...</option>
                            {jobs.map((job) => (
                              <option key={job.id} value={job.id}>
                                {job.title}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={handleInvite}
                            disabled={inviting}
                            className="inline-flex items-center gap-2 rounded-xl bg-[#16324f] px-4 py-2 text-xs font-bold text-white transition-all hover:bg-[#1a4266] disabled:opacity-50"
                          >
                            {inviting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                            Invite
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 rounded-3xl border border-stone-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/70">
                      <div>
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">About</h3>
                        <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                          {profile.bio || "No summary available."}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {profile.qualification && (
                      <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/40">
                        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Qualification</p>
                        <p className="mt-2 text-sm font-medium text-slate-800 dark:text-white">{profile.qualification}</p>
                      </div>
                    )}
                    {profile.portfolio_links?.length ? (
                      <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/40">
                        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Portfolio</p>
                        <div className="mt-2 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                          {profile.portfolio_links.map((link, index) => (
                            <a key={index} href={link} target="_blank" rel="noreferrer" className="block text-slate-900 hover:text-[#16324f] dark:text-slate-100 dark:hover:text-[#7cdef4]">
                              <Globe size={14} className="inline-block mr-2" />
                              {link}
                            </a>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-4 rounded-3xl border border-stone-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/70">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Contact</p>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                          {profile.isContactGated ? "Contact details are gated until you unlock this candidate." : "Contact available"}
                        </p>
                      </div>
                      <button
                        onClick={onToggleSave}
                        className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-stone-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                      >
                        <Bookmark size={14} />
                        {isSaved ? "Saved" : "Save"}
                      </button>
                    </div>

                    <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                      {profile.contact ? (
                        <>
                          {profile.contact.email && (
                            <div className="flex items-center gap-2">
                              <Mail size={14} />
                              <span>{profile.contact.email}</span>
                            </div>
                          )}
                          {profile.contact.phone && (
                            <div className="flex items-center gap-2">
                              <Phone size={14} />
                              <span>{profile.contact.phone}</span>
                            </div>
                          )}
                          {profile.contact.whatsapp && (
                            <div className="rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">WhatsApp available</div>
                          )}
                        </>
                      ) : (
                        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-400">
                          {profile.contactLimitReached
                            ? "You have reached your monthly contact reveal limit for this candidate. Contact details will appear next month or after upgrading."
                            : profile.profile_visibility === "ANONYMOUS"
                            ? "This candidate is anonymous, so only limited details are shown until they reveal contact."
                            : "This candidate has chosen to gate contact details."}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <section className="space-y-4 rounded-3xl border border-stone-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/70">
                      <div className="flex items-center gap-2">
                        <Briefcase size={16} className="text-slate-400" />
                        <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Experience</h3>
                      </div>
                      {profile.experience?.length ? (
                        <div className="space-y-4">
                          {profile.experience.map((item, index) => (
                            <div key={index} className="rounded-3xl border border-stone-200 bg-stone-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.role || item.title || "Experience"}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{item.company || item.organization || "Company not set"}</p>
                              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{formatDateRange(item.startDate || item.start_date, item.endDate || item.end_date)}</p>
                              {item.description && <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{item.description}</p>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 dark:text-slate-400">No experience details available.</p>
                      )}
                    </section>

                    <section className="space-y-4 rounded-3xl border border-stone-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/70">
                      <div className="flex items-center gap-2">
                        <GraduationCap size={16} className="text-slate-400" />
                        <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Education</h3>
                      </div>
                      {profile.education?.length ? (
                        <div className="space-y-4">
                          {profile.education.map((item, index) => (
                            <div key={index} className="rounded-3xl border border-stone-200 bg-stone-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.degree || item.qualification || "Education"}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{item.institution || item.school || item.university || "Institution not set"}</p>
                              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{formatDateRange(item.startDate || item.start_date, item.endDate || item.end_date)}</p>
                              {item.description && <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{item.description}</p>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 dark:text-slate-400">No education records found.</p>
                      )}
                    </section>
                  </div>

                  <section className="rounded-3xl border border-stone-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/70">
                    <div className="flex items-center gap-2">
                      <GraduationCap size={16} className="text-slate-400" />
                      <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Certificates</h3>
                    </div>
                    {profile.certificates?.length ? (
                      <div className="mt-4 space-y-4">
                        {profile.certificates.map((certificate, index) => (
                          <div key={index} className="rounded-3xl border border-stone-200 bg-stone-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{certificate.title || certificate.certificate || "Certificate"}</p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{certificate.issuer || certificate.issuing_organization || "Issuer not set"}</p>
                            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{formatDate(certificate.issue_date || certificate.issueDate) || "Date not set"}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">No certificates listed.</p>
                    )}
                  </section>

                  {profile.skills?.length ? (
                    <section className="rounded-3xl border border-stone-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/70">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">*</span>
                        <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Skills</h3>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {profile.skills.map((skill, index) => (
                          <span key={index} className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </section>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-3xl border border-stone-200 bg-stone-50 p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400">
                  Select a candidate to view their full details.
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
