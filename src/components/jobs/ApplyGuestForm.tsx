"use client";

import { useState } from "react";
import { Loader2, UploadCloud, CheckCircle2, AlertCircle, FileText, X } from "lucide-react";
import { toast } from "sonner";

interface ScreeningQuestion {
    id: string;
    question: string;
    required?: boolean;
}

interface ApplyGuestFormProps {
    jobId: string;
    jobTitle: string;
    companyName: string;
    screeningQuestions?: ScreeningQuestion[] | null;
    onSuccess?: () => void;
}

export default function ApplyGuestForm({
    jobId,
    jobTitle,
    companyName,
    screeningQuestions,
    onSuccess,
}: ApplyGuestFormProps) {
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [claimUrl, setClaimUrl] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            toast.error("File size exceeds 10MB limit.");
            return;
        }

        const validTypes = [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ];

        if (!validTypes.includes(file.type) && !file.name.match(/\.(pdf|doc|docx)$/i)) {
            toast.error("Please upload a PDF or Word document (.pdf, .doc, .docx).");
            return;
        }

        setResumeFile(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        if (!fullName.trim() || !email.trim()) {
            setErrorMsg("Full Name and Email Address are required.");
            return;
        }

        if (!resumeFile) {
            setErrorMsg("Please attach your CV / Resume document.");
            return;
        }

        // Validate required questions
        if (screeningQuestions && screeningQuestions.length > 0) {
            for (const q of screeningQuestions) {
                if (q.required && !answers[q.id]?.trim()) {
                    setErrorMsg(`Please answer the required question: "${q.question}"`);
                    return;
                }
            }
        }

        setIsSubmitting(true);

        try {
            const formData = new FormData();
            formData.append("fullName", fullName.trim());
            formData.append("email", email.trim().toLowerCase());
            if (phone.trim()) formData.append("phone", phone.trim());
            formData.append("resume", resumeFile);
            formData.append("screeningAnswers", JSON.stringify(answers));

            const res = await fetch(`/api/jobs/${jobId}/apply-public`, {
                method: "POST",
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to submit application.");
            }

            if (data.claimUrl) {
                setClaimUrl(data.claimUrl);
            }
            setIsSubmitted(true);
            toast.success("Application successfully submitted!");
            if (onSuccess) onSuccess();

        } catch (err: any) {
            setErrorMsg(err.message || "An error occurred while submitting.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSubmitted) {
        return (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50/80 p-8 text-center dark:border-emerald-900/40 dark:bg-emerald-950/20">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">
                    <CheckCircle2 size={32} />
                </div>
                <h3 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">
                    Application Submitted!
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Thank you, <strong className="text-slate-900 dark:text-white">{fullName}</strong>. Your application for <strong className="text-slate-900 dark:text-white">{jobTitle}</strong> at <strong className="text-slate-900 dark:text-white">{companyName}</strong> has been received and routed directly to their hiring team.
                </p>
                <div className="mt-4 rounded-2xl border border-emerald-200/80 bg-white p-4 text-xs text-slate-500 shadow-xs dark:border-emerald-900/30 dark:bg-slate-900">
                    We will contact you at <strong className="text-slate-700 dark:text-slate-200">{email}</strong> if your credentials meet the next stage requirements.
                </div>

                {/* Claim Your Profile Magic Loop */}
                {claimUrl && (
                    <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/90 p-5 text-left dark:border-amber-900/40 dark:bg-amber-950/20">
                        <div className="flex items-start gap-3">
                            <span className="text-xl">✨</span>
                            <div>
                                <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                                    Track Your Application in Real Time
                                </h4>
                                <p className="mt-1 text-xs text-amber-800/80 dark:text-amber-300/80 leading-relaxed">
                                    Claim your free Aganyu account with one click to monitor your application status, see when the employer reviews your CV, and receive interview invites.
                                </p>
                                <a
                                    href={claimUrl}
                                    className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-amber-700 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500"
                                >
                                    Claim My Profile & Track Status →
                                </a>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="border-b border-stone-200 pb-4 dark:border-slate-800">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    Apply for {jobTitle}
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Submit your application directly without an account. No password or registration needed.
                </p>
            </div>

            {errorMsg && (
                <div className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300">
                    <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
                    <span>{errorMsg}</span>
                </div>
            )}

            {/* Personal Details */}
            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Kondwani Banda"
                        className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#16324f] dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:border-amber-400"
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Email Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="kondwani@example.com"
                        className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#16324f] dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:border-amber-400"
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Phone / WhatsApp Number
                    </label>
                    <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+265 999 123 456"
                        className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#16324f] dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:border-amber-400"
                    />
                </div>
            </div>

            {/* Resume Upload */}
            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    CV / Resume Document <span className="text-rose-500">*</span>
                </label>

                {!resumeFile ? (
                    <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-stone-200 bg-stone-50/60 p-6 transition hover:border-[#16324f] hover:bg-stone-50 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-amber-400">
                        <UploadCloud size={28} className="text-slate-400" />
                        <span className="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                            Click to upload or drag & drop your CV
                        </span>
                        <span className="mt-0.5 text-[11px] text-slate-400">
                            PDF, DOC, or DOCX (Max 10MB)
                        </span>
                        <input
                            type="file"
                            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                    </label>
                ) : (
                    <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                                <FileText size={20} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-xs">
                                    {resumeFile.name}
                                </p>
                                <p className="text-[11px] text-slate-500">
                                    {(resumeFile.size / (1024 * 1024)).toFixed(2)} MB
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setResumeFile(null)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50"
                        >
                            <X size={16} />
                        </button>
                    </div>
                )}
            </div>

            {/* Screening Questions */}
            {screeningQuestions && screeningQuestions.length > 0 && (
                <div className="space-y-4 border-t border-stone-100 pt-5 dark:border-slate-800">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Employer Screening Questions
                    </h4>

                    {screeningQuestions.map((q, idx) => (
                        <div key={q.id || idx} className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-800 dark:text-slate-200">
                                {idx + 1}. {q.question} {q.required && <span className="text-rose-500">*</span>}
                            </label>
                            <input
                                type="text"
                                required={q.required}
                                value={answers[q.id] || ""}
                                onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                placeholder="Your answer..."
                                className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs text-slate-900 outline-none transition focus:border-[#16324f] dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                            />
                        </div>
                    ))}
                </div>
            )}

            <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#16324f] px-5 py-3 text-sm font-bold text-white shadow-md transition hover:opacity-90 disabled:opacity-50 dark:bg-amber-400 dark:text-slate-950"
            >
                {isSubmitting ? (
                    <>
                        <Loader2 size={16} className="animate-spin" />
                        Submitting Application...
                    </>
                ) : (
                    "Submit Application"
                )}
            </button>
        </form>
    );
}
