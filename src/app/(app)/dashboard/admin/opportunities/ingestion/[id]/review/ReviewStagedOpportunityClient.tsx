"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/ui";
import { ArrowLeft, Sparkles, Info, Send, FileText, XCircle, ExternalLink, ShieldCheck } from "lucide-react";
import Link from "next/link";

const CATEGORIES = [
    { value: "SCHOLARSHIP", label: "🎓 Scholarship" },
    { value: "GRANT", label: "💰 Grant" },
    { value: "FUNDING", label: "💸 Funding" },
    { value: "TRAINING", label: "📚 Training Programme" },
    { value: "CERTIFICATION", label: "🏆 Certification" },
    { value: "FELLOWSHIP", label: "🌍 Fellowship" },
    { value: "INTERNSHIP", label: "🏢 Internship" },
    { value: "CAREER_PROGRAM", label: "🚀 Career Programme" },
];

const LOCATION_TYPES = [
    { value: "GLOBAL", label: "Global (Open worldwide)" },
    { value: "REMOTE", label: "Remote" },
    { value: "IN_PERSON", label: "In-person" },
    { value: "HYBRID", label: "Hybrid" },
];

const SOURCES = [
    { value: "RSS_API", label: "⚡ RSS / API Automation Feed" },
    { value: "ORGANIZATION_WEBSITE", label: "🌐 Organization Website" },
    { value: "UNIVERSITY", label: "🎓 University / Academic Institution" },
    { value: "GOVERNMENT", label: "🏛️ Government Agency" },
    { value: "NGO", label: "🤝 NGO / Non-Profit" },
    { value: "MANUAL", label: "✍️ Manual Admin Entry" },
    { value: "LINKEDIN", label: "💼 LinkedIn" },
    { value: "PARTNER", label: "🤝 Industry Partner" },
];

const FUNDING_TYPES = [
    { value: "NOT_APPLICABLE", label: "Not applicable" },
    { value: "FULL_FUNDING", label: "Full funding" },
    { value: "PARTIAL_FUNDING", label: "Partial funding" },
    { value: "STIPEND", label: "Stipend" },
    { value: "UNPAID", label: "Unpaid" },
];

const GENDER_ELIGIBILITY = [
    { value: "ANY", label: "Open to all" },
    { value: "WOMEN_ONLY", label: "Women only" },
    { value: "MEN_ONLY", label: "Men only" },
];

function slugify(text: string) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-2xl border border-stone-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
            <div className="border-b border-stone-100 px-6 py-4 dark:border-slate-800">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
            </div>
            <div className="p-6 space-y-5">{children}</div>
        </div>
    );
}

function Field({ label, hint, children, required }: { label: string; hint?: string; children: React.ReactNode; required?: boolean }) {
    return (
        <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {label} {required && <span className="text-red-400">*</span>}
            </label>
            {children}
            {hint && <p className="text-xs text-slate-400">{hint}</p>}
        </div>
    );
}

const inputCls = "w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#16324f] focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-slate-500";
const selectCls = `${inputCls} cursor-pointer`;
const textareaCls = `${inputCls} resize-none`;

function WeightSlider({ label, name, value, onChange }: { label: string; name: string; value: number; onChange: (n: string, v: number) => void }) {
    return (
        <div className="space-y-1.5">
            <div className="flex justify-between">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{label}</span>
                <span className="text-xs font-bold text-[#16324f] dark:text-slate-200">{value}%</span>
            </div>
            <input
                type="range"
                min={0}
                max={100}
                value={value}
                onChange={(e) => onChange(name, parseInt(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-stone-200 accent-[#16324f]"
            />
        </div>
    );
}

function joinList(value: unknown) {
    if (Array.isArray(value)) return value.join(", ");
    if (typeof value === "string") return value;
    return "";
}

export default function ReviewStagedOpportunityClient({ item }: { item: any }) {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const canMutate = item.status === "PENDING_REVIEW" || item.status === "DUPLICATE";

    const [form, setForm] = useState({
        title: item.title || "",
        slug: slugify(`${item.title || ""}-${item.organization_name || ""}`),
        category: item.category || "SCHOLARSHIP",
        organization_name: item.organization_name || "",
        organization_logo: "",
        description: item.description || "",
        short_description: item.short_description || "",
        country: item.country || "",
        location_type: item.location_type || "GLOBAL",
        application_url: item.application_url || "",
        contact_email: item.contact_email || "",
        deadline: item.deadline ? String(item.deadline).split("T")[0] : "",
        eligibility_requirements: item.eligibility_requirements || "",
        education_requirements: item.education_requirements || "",
        required_skills: joinList(item.required_skills),
        required_certifications: joinList(item.required_certifications),
        age_min: item.age_min?.toString() || "",
        age_max: item.age_max?.toString() || "",
        experience_years_min: item.experience_years_min?.toString() || "0",
        funding_type: item.funding_type || "NOT_APPLICABLE",
        funding_amount: item.funding_amount || "",
        target_regions: joinList(item.target_regions) || "GLOBAL",
        host_institutions: joinList(item.host_institutions),
        gender_eligibility: item.gender_eligibility || "ANY",
        source: "RSS_API",
        weight_education: 40,
        weight_certifications: 30,
        weight_skills: 20,
        weight_location: 10,
    });

    const set = (key: string, value: any) => setForm((prev) => ({ ...prev, [key]: value }));

    const handleWeightChange = (name: string, value: number) => {
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const totalWeight = form.weight_education + form.weight_certifications + form.weight_skills + form.weight_location;

    const splitList = (value: string) =>
        value.split(",").map((s) => s.trim()).filter(Boolean);

    const stagedPayload = () => ({
        title: form.title,
        organization_name: form.organization_name,
        description: form.description,
        short_description: form.short_description,
        category: form.category,
        country: form.country || null,
        location_type: form.location_type,
        application_url: form.application_url,
        contact_email: form.contact_email || null,
        deadline: form.deadline || null,
        eligibility_requirements: form.eligibility_requirements || null,
        education_requirements: form.education_requirements || null,
        required_skills: splitList(form.required_skills),
        required_certifications: splitList(form.required_certifications),
        age_min: form.age_min ? parseInt(form.age_min, 10) : null,
        age_max: form.age_max ? parseInt(form.age_max, 10) : null,
        experience_years_min: form.experience_years_min ? parseInt(form.experience_years_min, 10) : 0,
        funding_type: form.funding_type,
        funding_amount: form.funding_amount || null,
        target_regions: splitList(form.target_regions).length ? splitList(form.target_regions) : ["GLOBAL"],
        host_institutions: splitList(form.host_institutions),
        gender_eligibility: form.gender_eligibility,
    });

    const approvalExtras = () => ({
        slug: form.slug,
        organization_logo: form.organization_logo || undefined,
        source: form.source,
        weight_education: form.weight_education,
        weight_certifications: form.weight_certifications,
        weight_skills: form.weight_skills,
        weight_location: form.weight_location,
    });

    const saveStaged = async () => {
        const res = await apiFetch(`/api/admin/opportunities/ingestion/${item.id}`, {
            method: "PATCH",
            body: JSON.stringify(stagedPayload()),
            headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || "Failed to save staged opportunity.");
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (totalWeight !== 100) {
            toast.error(`Matching weights must sum to 100% (currently ${totalWeight}%).`);
            return;
        }
        setSaving(true);
        try {
            await saveStaged();
            toast.success("Corrections saved. This listing is still unpublished.");
            router.refresh();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleApprove = async (publish: boolean) => {
        if (totalWeight !== 100) {
            toast.error(`Matching weights must sum to 100% (currently ${totalWeight}%).`);
            return;
        }
        setSaving(true);
        try {
            await saveStaged();
            const res = await apiFetch(`/api/admin/opportunities/ingestion/${item.id}`, {
                method: "POST",
                body: JSON.stringify({ action: "approve", publish, featured: false, ...approvalExtras() }),
                headers: { "Content-Type": "application/json" },
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || "Approval failed.");
            }
            const data = await res.json();
            toast.success(publish ? "Opportunity approved and published!" : "Opportunity approved as draft.");
            if (data.opportunity?.id) {
                router.push(`/dashboard/admin/opportunities/${data.opportunity.id}/edit`);
            } else {
                router.push("/dashboard/admin/opportunities?tab=ingestion");
            }
            router.refresh();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleReject = async () => {
        if (!confirm("Reject this ingested opportunity? It will stay in the queue as rejected.")) return;
        setSaving(true);
        try {
            const res = await apiFetch(`/api/admin/opportunities/ingestion/${item.id}`, {
                method: "POST",
                body: JSON.stringify({ action: "reject", reason: "Admin rejected after review" }),
                headers: { "Content-Type": "application/json" },
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || "Rejection failed.");
            }
            toast.success("Opportunity rejected.");
            router.push("/dashboard/admin/opportunities?tab=ingestion");
            router.refresh();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="pb-20 space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Link
                    href="/dashboard/admin/opportunities?tab=ingestion"
                    className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white"
                >
                    <ArrowLeft size={16} /> Back to ingestion queue
                </Link>

                {canMutate && (
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={handleReject}
                            disabled={saving}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50 dark:border-red-900/50 dark:bg-red-950/30"
                        >
                            <XCircle size={14} /> Reject
                        </button>
                        <button
                            type="button"
                            onClick={() => handleApprove(false)}
                            disabled={saving}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-stone-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        >
                            <FileText size={14} /> Approve as Draft
                        </button>
                        <button
                            type="button"
                            onClick={() => handleApprove(true)}
                            disabled={saving}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                            <Send size={14} /> Approve & Publish
                        </button>
                    </div>
                )}
            </div>

            <PageHeader
                title={`Review: ${item.title}`}
                subtitle={`Status: ${item.status.replace("_", " ")} · Source: ${item.source?.name || "Ingestion feed"} · AI confidence ${item.overall_confidence ?? 0}%`}
            />

            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-xs text-blue-800 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-200">
                <span className="inline-flex items-center gap-1 font-medium">
                    <ShieldCheck size={14} /> Edit AI-extracted fields here before they go live.
                </span>
                {form.application_url && (
                    <a
                        href={form.application_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline dark:text-blue-300"
                    >
                        Open official webpage <ExternalLink size={12} />
                    </a>
                )}
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                <FormSection title="Basic Information">
                    <Field label="Opportunity Title" required>
                        <input
                            type="text"
                            value={form.title}
                            onChange={(e) => set("title", e.target.value)}
                            className={inputCls}
                            required
                            disabled={!canMutate}
                        />
                    </Field>

                    <div className="grid gap-5 sm:grid-cols-2">
                        <Field label="URL Slug" hint="Used when this item is created as an opportunity." required>
                            <input
                                type="text"
                                value={form.slug}
                                onChange={(e) => set("slug", slugify(e.target.value))}
                                className={inputCls}
                                required
                                disabled={!canMutate}
                            />
                        </Field>
                        <Field label="Category" required>
                            <select value={form.category} onChange={(e) => set("category", e.target.value)} className={selectCls} disabled={!canMutate}>
                                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                            </select>
                        </Field>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-3">
                        <Field label="Organisation Name" required>
                            <input
                                type="text"
                                value={form.organization_name}
                                onChange={(e) => set("organization_name", e.target.value)}
                                className={inputCls}
                                required
                                disabled={!canMutate}
                            />
                        </Field>
                        <Field label="Organisation Logo URL">
                            <input
                                type="url"
                                value={form.organization_logo}
                                onChange={(e) => set("organization_logo", e.target.value)}
                                className={inputCls}
                                disabled={!canMutate}
                            />
                        </Field>
                        <Field label="Opportunity Source">
                            <select value={form.source} onChange={(e) => set("source", e.target.value)} className={selectCls} disabled={!canMutate}>
                                {SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                        </Field>
                    </div>

                    <Field label="Short Description" required>
                        <textarea
                            value={form.short_description}
                            onChange={(e) => set("short_description", e.target.value)}
                            rows={2}
                            maxLength={220}
                            className={textareaCls}
                            required
                            disabled={!canMutate}
                        />
                    </Field>

                    <Field label="Full Description" required>
                        <textarea
                            value={form.description}
                            onChange={(e) => set("description", e.target.value)}
                            rows={6}
                            className={textareaCls}
                            required
                            disabled={!canMutate}
                        />
                    </Field>
                </FormSection>

                <FormSection title="Application Details">
                    <Field label="Application URL" required>
                        <input
                            type="text"
                            value={form.application_url}
                            onChange={(e) => set("application_url", e.target.value)}
                            className={inputCls}
                            required
                            disabled={!canMutate}
                        />
                    </Field>

                    <div className="grid gap-5 sm:grid-cols-2">
                        <Field label="Contact Email">
                            <input
                                type="email"
                                value={form.contact_email}
                                onChange={(e) => set("contact_email", e.target.value)}
                                className={inputCls}
                                disabled={!canMutate}
                            />
                        </Field>
                        <Field label="Application Deadline">
                            <input
                                type="date"
                                value={form.deadline}
                                onChange={(e) => set("deadline", e.target.value)}
                                className={inputCls}
                                disabled={!canMutate}
                            />
                        </Field>
                    </div>
                </FormSection>

                <FormSection title="Location & Coverage">
                    <div className="grid gap-5 sm:grid-cols-2">
                        <Field label="Location Type" required>
                            <select value={form.location_type} onChange={(e) => set("location_type", e.target.value)} className={selectCls} disabled={!canMutate}>
                                {LOCATION_TYPES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                            </select>
                        </Field>
                        <Field label="Country">
                            <input
                                type="text"
                                value={form.country}
                                onChange={(e) => set("country", e.target.value)}
                                className={inputCls}
                                disabled={!canMutate}
                            />
                        </Field>
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2">
                        <Field label="Target Regions" hint="Comma-separated — e.g. Africa, Malawi, Global">
                            <input
                                type="text"
                                value={form.target_regions}
                                onChange={(e) => set("target_regions", e.target.value)}
                                className={inputCls}
                                disabled={!canMutate}
                            />
                        </Field>
                        <Field label="Host Institutions" hint="Comma-separated">
                            <input
                                type="text"
                                value={form.host_institutions}
                                onChange={(e) => set("host_institutions", e.target.value)}
                                className={inputCls}
                                disabled={!canMutate}
                            />
                        </Field>
                    </div>
                </FormSection>

                <FormSection title="Funding">
                    <div className="grid gap-5 sm:grid-cols-2">
                        <Field label="Funding Type" required>
                            <select value={form.funding_type} onChange={(e) => set("funding_type", e.target.value)} className={selectCls} disabled={!canMutate}>
                                {FUNDING_TYPES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                            </select>
                        </Field>
                        <Field label="Funding Amount">
                            <input
                                type="text"
                                value={form.funding_amount}
                                onChange={(e) => set("funding_amount", e.target.value)}
                                className={inputCls}
                                disabled={!canMutate}
                            />
                        </Field>
                    </div>
                </FormSection>

                <FormSection title="Eligibility Requirements">
                    <Field label="Gender Eligibility">
                        <select value={form.gender_eligibility} onChange={(e) => set("gender_eligibility", e.target.value)} className={selectCls} disabled={!canMutate}>
                            {GENDER_ELIGIBILITY.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                        </select>
                    </Field>

                    <Field label="General Eligibility">
                        <textarea
                            value={form.eligibility_requirements}
                            onChange={(e) => set("eligibility_requirements", e.target.value)}
                            rows={3}
                            className={textareaCls}
                            disabled={!canMutate}
                        />
                    </Field>

                    <Field label="Education Requirements">
                        <input
                            type="text"
                            value={form.education_requirements}
                            onChange={(e) => set("education_requirements", e.target.value)}
                            className={inputCls}
                            disabled={!canMutate}
                        />
                    </Field>

                    <div className="grid gap-5 sm:grid-cols-2">
                        <Field label="Required Skills">
                            <input
                                type="text"
                                value={form.required_skills}
                                onChange={(e) => set("required_skills", e.target.value)}
                                className={inputCls}
                                disabled={!canMutate}
                            />
                        </Field>
                        <Field label="Required Certifications">
                            <input
                                type="text"
                                value={form.required_certifications}
                                onChange={(e) => set("required_certifications", e.target.value)}
                                className={inputCls}
                                disabled={!canMutate}
                            />
                        </Field>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-3">
                        <Field label="Min Age">
                            <input type="number" value={form.age_min} onChange={(e) => set("age_min", e.target.value)} className={inputCls} disabled={!canMutate} />
                        </Field>
                        <Field label="Max Age">
                            <input type="number" value={form.age_max} onChange={(e) => set("age_max", e.target.value)} className={inputCls} disabled={!canMutate} />
                        </Field>
                        <Field label="Min Experience (yrs)">
                            <input type="number" value={form.experience_years_min} onChange={(e) => set("experience_years_min", e.target.value)} className={inputCls} disabled={!canMutate} />
                        </Field>
                    </div>
                </FormSection>

                <FormSection title="AI Matching Configuration">
                    <div className="mb-4 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900/30 dark:bg-blue-900/10">
                        <Info size={16} className="mt-0.5 shrink-0 text-blue-500" />
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                            Weights must sum to 100%. Currently: <strong className={totalWeight === 100 ? "text-green-600" : "text-red-500"}>{totalWeight}%</strong>
                        </p>
                    </div>
                    <div className="grid gap-6 sm:grid-cols-2">
                        <WeightSlider label="Education Weight" name="weight_education" value={form.weight_education} onChange={handleWeightChange} />
                        <WeightSlider label="Certifications Weight" name="weight_certifications" value={form.weight_certifications} onChange={handleWeightChange} />
                        <WeightSlider label="Skills Weight" name="weight_skills" value={form.weight_skills} onChange={handleWeightChange} />
                        <WeightSlider label="Location Weight" name="weight_location" value={form.weight_location} onChange={handleWeightChange} />
                    </div>
                </FormSection>

                {canMutate && (
                    <div className="flex items-center justify-end rounded-2xl border border-stone-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
                        <button
                            type="submit"
                            disabled={saving || totalWeight !== 100}
                            className="flex items-center gap-2 rounded-xl bg-[#16324f] px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Sparkles size={16} />
                            {saving ? "Saving…" : "Save Corrections"}
                        </button>
                    </div>
                )}
            </form>
        </div>
    );
}
