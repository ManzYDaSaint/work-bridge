"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { employerProfileSchema, EmployerProfileValues } from "@/lib/validations/employer";
import { apiFetch, apiFetchJson } from "@/lib/api";
import { Camera, Loader2, Check, Shield, CreditCard, AlertCircle, X } from "lucide-react";
import { PageHeader, SectionCard, Badge } from "@/components/dashboard/ui";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

function Toggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
    return (
        <label className="relative inline-flex cursor-pointer items-center">
            <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
            <div className="h-6 w-11 rounded-full bg-slate-200 transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#16324f] peer-checked:after:translate-x-full dark:bg-slate-700" />
        </label>
    );
}

function LogoUpload({ url, onChange }: { url?: string; onChange: (url: string) => void }) {
    const [uploading, setUploading] = useState(false);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        const formData = new FormData();
        formData.append("logo", file);
        try {
            const res = await fetch("/api/employer/logo", { method: "POST", body: formData });
            const data = await res.json();
            if (data.url) onChange(data.url);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-stone-300 bg-stone-50 dark:border-slate-700 dark:bg-slate-900">
                {url ? <img src={url} alt="Company logo" className="h-full w-full object-cover" /> : <Camera className="text-slate-400" />}
            </div>
            <label className="cursor-pointer text-sm font-semibold text-[#16324f] hover:underline dark:text-slate-200">
                {uploading ? "Uploading..." : "Upload logo"}
                <input type="file" className="hidden" accept="image/*" onChange={handleUpload} disabled={uploading} />
            </label>
        </div>
    );
}

export default function EmployerSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [plan, setPlan] = useState<"FREE" | "PREMIUM">("FREE");
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [recruiterVerified, setRecruiterVerified] = useState(false);
    const [approvalStatus, setApprovalStatus] = useState<"PENDING" | "APPROVED" | "REJECTED">("PENDING");
    const [showCloseModal, setShowCloseModal] = useState(false);
    const [closeReasons, setCloseReasons] = useState<string[]>([]);
    const [closeNotes, setCloseNotes] = useState("");
    const [closeSubmitting, setCloseSubmitting] = useState(false);
    const [closeSubmitted, setCloseSubmitted] = useState(false);
    const router = useRouter();

    const { register, handleSubmit, reset, watch, setValue, formState: { errors, isDirty } } = useForm<EmployerProfileValues>({
        resolver: zodResolver(employerProfileSchema),
        defaultValues: {
            applicationAlerts: true,
        },
    });

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await apiFetch("/api/employer/profile");
                if (res.ok) {
                    const data = await res.json();
                    setPlan(data.plan || "FREE");
                    setRecruiterVerified(Boolean(data.recruiterVerified));
                    setApprovalStatus(data.status || "PENDING");
                    reset({
                        companyName: data.companyName ?? "",
                        industry: data.industry ?? "",
                        location: data.location ?? "",
                        website: data.website ?? "",
                        description: data.description ?? "",
                        logoUrl: data.logoUrl ?? "",
                        applicationAlerts: data.applicationAlerts ?? true,
                    });
                }
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [reset]);

    const onSubmit = async (data: EmployerProfileValues) => {
        setSaving(true);
        try {
            await apiFetchJson("/api/employer/profile", { method: "PUT", body: JSON.stringify(data) });
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2500);
            router.refresh();
        } finally {
            setSaving(false);
        }
    };

    const CLOSE_REASONS = [
        "Hired successfully — no longer need the platform",
        "Too expensive for our budget",
        "Found a better alternative platform",
        "Not getting enough quality candidates",
        "Company restructured or closed",
        "Platform is too complex to use",
        "Taking a break from hiring",
    ];

    const handleCloseRequest = async () => {
        if (closeReasons.length === 0) return;
        setCloseSubmitting(true);
        try {
            const res = await apiFetch("/api/employer/account/close-request", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reasons: closeReasons, additionalNotes: closeNotes }),
            });
            if (res.ok) {
                setCloseSubmitted(true);
            } else {
                toast.error("Failed to submit. Please try again.");
            }
        } finally {
            setCloseSubmitting(false);
        }
    };

    if (loading) {

        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#16324f]" />
            </div>
        );
    }

    const inputClass = "w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-stone-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white";

    return (
        <div className="space-y-6 pb-20">
            <PageHeader title="Settings" subtitle="Edit company details, preferences, and plan access in one place." />

            {/* Approval status banner — only shown while pending or rejected */}
            {approvalStatus === "PENDING" && (
                <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
                    <div>
                        <p className="font-semibold">Your company profile is under review</p>
                        <p className="mt-0.5 text-xs opacity-80">Keep your profile complete and accurate to speed up the approval process. Posting and outreach unlock once approved.</p>
                    </div>
                </div>
            )}
            {approvalStatus === "REJECTED" && (
                <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
                    <div>
                        <p className="font-semibold">Account verification was declined</p>
                        <p className="mt-0.5 text-xs opacity-80">Please review your company details and ensure everything is accurate, then contact support if you believe this is an error.</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    <SectionCard title="Company profile">
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 p-6">
                            <LogoUpload url={watch("logoUrl")} onChange={(url) => setValue("logoUrl", url, { shouldDirty: true })} />
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <input {...register("companyName")} placeholder="Company name" className={inputClass} />
                                    {errors.companyName && <p className="mt-1 text-xs text-red-600">{errors.companyName.message}</p>}
                                </div>
                                <div>
                                    <input {...register("industry")} placeholder="Industry" className={inputClass} />
                                    {errors.industry && <p className="mt-1 text-xs text-red-600">{errors.industry.message}</p>}
                                </div>
                                <div>
                                    <input {...register("location")} placeholder="Location" className={inputClass} />
                                    {errors.location && <p className="mt-1 text-xs text-red-600">{errors.location.message}</p>}
                                </div>
                                <div>
                                    <input {...register("website")} placeholder="Website" className={inputClass} />
                                    {errors.website && <p className="mt-1 text-xs text-red-600">{errors.website.message}</p>}
                                </div>
                            </div>
                            <div>
                                <textarea {...register("description")} rows={5} placeholder="What does your company do?" className={`${inputClass} resize-y`} />
                                {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>}
                            </div>
                            <div className="flex items-center gap-3 border-t border-stone-200 pt-4 dark:border-slate-800">
                                <button type="submit" disabled={saving || !isDirty} className="inline-flex items-center gap-2 rounded-xl bg-[#16324f] px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : saveSuccess ? <Check size={16} /> : null}
                                    {saving ? "Saving..." : saveSuccess ? "Saved" : "Save changes"}
                                </button>
                            </div>
                        </form>
                    </SectionCard>
                </div>

                <div className="space-y-6">
                    {/* Account status */}
                    <SectionCard title="Account status">
                        <div className="space-y-3 p-6">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-slate-600 dark:text-slate-400">Verification</p>
                                <Badge
                                    label={approvalStatus === "APPROVED" ? "Approved" : approvalStatus === "REJECTED" ? "Rejected" : "Pending"}
                                    variant={approvalStatus === "APPROVED" ? "green" : approvalStatus === "REJECTED" ? "red" : "yellow"}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-slate-600 dark:text-slate-400">Recruiter trust</p>
                                <Badge
                                    label={recruiterVerified ? "Verified" : "Unverified"}
                                    variant={recruiterVerified ? "green" : "slate"}
                                />
                            </div>
                        </div>
                    </SectionCard>

                    {/* Plan */}
                    <SectionCard title="Plan">
                        <div className="space-y-4 p-6">
                            <div className="flex items-center justify-between">
                                <p className="text-lg font-semibold text-slate-900 dark:text-white">{plan === "PREMIUM" ? "Premium" : "Free"}</p>
                                <Badge label={plan} variant={plan === "PREMIUM" ? "green" : "secondary"} />
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {plan === "PREMIUM" ? "Unlimited listings and expanded workflow tools." : "Basic plan with up to 3 active roles."}
                            </p>
                            <Link href="/dashboard/employer/billing" className="inline-flex items-center gap-2 text-sm font-semibold text-[#16324f] hover:underline dark:text-slate-200">
                                <CreditCard size={16} />
                                Manage billing
                            </Link>
                        </div>
                    </SectionCard>

                    {/* Preferences */}
                    <SectionCard title="Preferences">
                        <div className="space-y-4 p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Application alerts</p>
                                    <p className="text-xs text-slate-400">Email notifications when a new applicant submits to one of your roles</p>
                                </div>
                                <Toggle checked={watch("applicationAlerts") ?? true} onChange={(val) => setValue("applicationAlerts", val, { shouldDirty: true })} />
                            </div>
                            {isDirty && (
                                <p className="text-xs text-amber-600 dark:text-amber-400">
                                    Save changes in the company profile form above to apply preference updates.
                                </p>
                            )}
                        </div>
                    </SectionCard>

                    {/* Danger zone */}
                    <SectionCard title="Danger zone">
                        <div className="space-y-3 p-6">
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Submitting a close request will notify the admin team, who will review and follow up with you before any data is removed.
                            </p>
                            <button
                                onClick={() => { setShowCloseModal(true); setCloseSubmitted(false); setCloseReasons([]); setCloseNotes(""); }}
                                className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 py-3 text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                            >
                                <Shield size={16} />
                                Close account
                            </button>
                        </div>
                    </SectionCard>

            {/* Close account modal */}
            {showCloseModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowCloseModal(false)} />
                    <div className="relative w-full max-w-lg rounded-[2rem] border border-stone-200 bg-[#fbf8f1] p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
                        <button onClick={() => setShowCloseModal(false)} className="absolute right-4 top-4 rounded-xl p-2 text-slate-400 hover:bg-stone-100 dark:hover:bg-slate-900">
                            <X size={18} />
                        </button>

                        {closeSubmitted ? (
                            <div className="flex flex-col items-center gap-4 py-6 text-center">
                                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
                                    <Check size={24} className="text-emerald-600" />
                                </div>
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Request received</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Your account closure request has been sent to the admin team. They will review your reasons and contact you shortly before any action is taken.
                                </p>
                                <button onClick={() => setShowCloseModal(false)} className="mt-2 rounded-xl border border-stone-200 px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-stone-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900">
                                    Close
                                </button>
                            </div>
                        ) : (
                            <>
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Close your account</h2>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                    Before we proceed, please let us know why you want to leave. The admin team will review your request before taking any action.
                                </p>

                                <div className="mt-5 space-y-3">
                                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Select your reasons</p>
                                    {CLOSE_REASONS.map((reason) => (
                                        <label key={reason} className="flex cursor-pointer items-start gap-3 rounded-xl border border-stone-200 bg-white p-3 hover:bg-stone-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800">
                                            <input
                                                type="checkbox"
                                                checked={closeReasons.includes(reason)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setCloseReasons((prev) => [...prev, reason]);
                                                    } else {
                                                        setCloseReasons((prev) => prev.filter((r) => r !== reason));
                                                    }
                                                }}
                                                className="mt-0.5 h-4 w-4 accent-[#16324f]"
                                            />
                                            <span className="text-sm text-slate-700 dark:text-slate-200">{reason}</span>
                                        </label>
                                    ))}
                                </div>

                                <div className="mt-4">
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">Anything else? (optional)</p>
                                    <textarea
                                        value={closeNotes}
                                        onChange={(e) => setCloseNotes(e.target.value)}
                                        rows={3}
                                        placeholder="Tell us more about your experience or what we could have done better..."
                                        className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-stone-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                    />
                                </div>

                                <div className="mt-5 flex items-center gap-3">
                                    <button
                                        onClick={handleCloseRequest}
                                        disabled={closeReasons.length === 0 || closeSubmitting}
                                        className="flex-1 rounded-xl bg-rose-600 py-3 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                                    >
                                        {closeSubmitting ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Submit closure request"}
                                    </button>
                                    <button onClick={() => setShowCloseModal(false)} className="flex-1 rounded-xl border border-stone-200 py-3 text-sm font-semibold text-slate-700 hover:bg-stone-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900">
                                        Cancel
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
                </div>
            </div>
        </div>
    );
}
