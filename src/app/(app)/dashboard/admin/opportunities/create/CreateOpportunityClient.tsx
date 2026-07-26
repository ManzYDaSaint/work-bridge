"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/ui";
import { ArrowLeft, Sparkles, Info } from "lucide-react";
import Link from "next/link";

// ── Constants ─────────────────────────────────────────────────────────────────

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
    { value: "MANUAL", label: "✍️ Manual Admin Entry" },
    { value: "ORGANIZATION_WEBSITE", label: "🌐 Organization Website" },
    { value: "UNIVERSITY", label: "🎓 University / Academic Institution" },
    { value: "GOVERNMENT", label: "🏛️ Government Agency" },
    { value: "NGO", label: "🤝 NGO / Non-Profit" },
    { value: "LINKEDIN", label: "💼 LinkedIn" },
    { value: "PARTNER", label: "🤝 Industry Partner" },
    { value: "RSS_API", label: "⚡ RSS / API Automation Feed" },
];

const FUNDING_TYPES = [
    { value: "NOT_APPLICABLE", label: "Not applicable" },
    { value: "FULL_FUNDING", label: "Full funding" },
    { value: "PARTIAL_FUNDING", label: "Partial funding" },
    { value: "STIPEND", label: "Stipend" },
    { value: "UNPAID", label: "Unpaid" },
];

// ── Form helpers ──────────────────────────────────────────────────────────────

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

// ── Matching Weight Slider ────────────────────────────────────────────────────

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

// ── Main Component ────────────────────────────────────────────────────────────

export default function CreateOpportunityClient({ adminId }: { adminId: string }) {
    const router = useRouter();
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        title: "",
        slug: "",
        category: "SCHOLARSHIP",
        organization_name: "",
        organization_logo: "",
        description: "",
        short_description: "",
        country: "",
        location_type: "GLOBAL",
        application_url: "",
        contact_email: "",
        deadline: "",
        eligibility_requirements: "",
        education_requirements: "",
        required_skills: "",
        required_certifications: "",
        age_min: "",
        age_max: "",
        experience_years_min: "0",
        funding_type: "NOT_APPLICABLE",
        funding_amount: "",
        source: "MANUAL",
        weight_education: 40,
        weight_certifications: 30,
        weight_skills: 20,
        weight_location: 10,
    });

    const set = (key: string, value: any) => setForm((prev) => ({ ...prev, [key]: value }));

    const handleTitleChange = (title: string) => {
        setForm((prev) => ({
            ...prev,
            title,
            slug: slugify(title),
        }));
    };

    const handleWeightChange = (name: string, value: number) => {
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const totalWeight = form.weight_education + form.weight_certifications + form.weight_skills + form.weight_location;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (totalWeight !== 100) {
            toast.error(`Matching weights must sum to 100% (currently ${totalWeight}%).`);
            return;
        }

        setSaving(true);
        try {
            const payload = {
                ...form,
                required_skills: form.required_skills
                    ? form.required_skills.split(",").map((s) => s.trim()).filter(Boolean)
                    : [],
                required_certifications: form.required_certifications
                    ? form.required_certifications.split(",").map((s) => s.trim()).filter(Boolean)
                    : [],
                age_min: form.age_min ? parseInt(form.age_min) : undefined,
                age_max: form.age_max ? parseInt(form.age_max) : undefined,
                experience_years_min: form.experience_years_min ? parseInt(form.experience_years_min) : 0,
                deadline: form.deadline || undefined,
                created_by_admin: adminId,
            };

            const res = await apiFetch("/api/admin/opportunities", {
                method: "POST",
                body: JSON.stringify(payload),
                headers: { "Content-Type": "application/json" },
            });

            if (res.ok) {
                const data = await res.json();
                toast.success("Opportunity created! Embedding is being generated in the background.");
                router.push(`/dashboard/admin/opportunities/${data.opportunity.id}/edit`);
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to create opportunity.");
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="pb-20 space-y-6">
            <div className="flex items-center gap-3">
                <Link
                    href="/dashboard/admin/opportunities"
                    className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white"
                >
                    <ArrowLeft size={16} /> Back
                </Link>
            </div>

            <PageHeader
                title="Create Opportunity"
                subtitle="Opportunities are saved as Draft. Review and publish when ready."
            />

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* ── Basic Info ── */}
                <FormSection title="Basic Information">
                    <Field label="Opportunity Title" required>
                        <input
                            type="text"
                            value={form.title}
                            onChange={(e) => handleTitleChange(e.target.value)}
                            placeholder="e.g. Google Africa Developer Scholarship 2026"
                            className={inputCls}
                            required
                        />
                    </Field>

                    <div className="grid gap-5 sm:grid-cols-2">
                        <Field label="URL Slug" hint="Auto-generated from title. Edit if needed.">
                            <input
                                type="text"
                                value={form.slug}
                                onChange={(e) => set("slug", slugify(e.target.value))}
                                placeholder="google-africa-scholarship-2026"
                                className={inputCls}
                                required
                            />
                        </Field>
                        <Field label="Category" required>
                            <select value={form.category} onChange={(e) => set("category", e.target.value)} className={selectCls}>
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
                                placeholder="e.g. Google, African Union, USAID"
                                className={inputCls}
                                required
                            />
                        </Field>
                        <Field label="Organisation Logo URL" hint="Optional — direct image URL">
                            <input
                                type="url"
                                value={form.organization_logo}
                                onChange={(e) => set("organization_logo", e.target.value)}
                                placeholder="https://..."
                                className={inputCls}
                            />
                        </Field>
                        <Field label="Opportunity Source" hint="Origin tracking">
                            <select value={form.source} onChange={(e) => set("source", e.target.value)} className={selectCls}>
                                {SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                        </Field>
                    </div>

                    <Field label="Short Description" hint="1–2 sentence summary displayed on cards (max 220 chars)" required>
                        <textarea
                            value={form.short_description}
                            onChange={(e) => set("short_description", e.target.value)}
                            rows={2}
                            maxLength={220}
                            placeholder="A brief, compelling summary of the opportunity."
                            className={textareaCls}
                            required
                        />
                    </Field>

                    <Field label="Full Description" required>
                        <textarea
                            value={form.description}
                            onChange={(e) => set("description", e.target.value)}
                            rows={6}
                            placeholder="Full details about the opportunity, benefits, selection process, and any important information."
                            className={textareaCls}
                            required
                        />
                    </Field>
                </FormSection>

                {/* ── Application Details ── */}
                <FormSection title="Application Details">
                    <Field label="Application URL" hint="Must be a full URL (https://...)" required>
                        <input
                            type="url"
                            value={form.application_url}
                            onChange={(e) => set("application_url", e.target.value)}
                            placeholder="https://apply.example.com/scholarship"
                            className={inputCls}
                            required
                        />
                    </Field>

                    <div className="grid gap-5 sm:grid-cols-2">
                        <Field label="Contact Email" hint="Optional — support/questions email">
                            <input
                                type="email"
                                value={form.contact_email}
                                onChange={(e) => set("contact_email", e.target.value)}
                                placeholder="scholarships@example.org"
                                className={inputCls}
                            />
                        </Field>
                        <Field label="Application Deadline">
                            <input
                                type="date"
                                value={form.deadline}
                                onChange={(e) => set("deadline", e.target.value)}
                                className={inputCls}
                            />
                        </Field>
                    </div>
                </FormSection>

                {/* ── Location ── */}
                <FormSection title="Location & Coverage">
                    <div className="grid gap-5 sm:grid-cols-2">
                        <Field label="Location Type" required>
                            <select value={form.location_type} onChange={(e) => set("location_type", e.target.value)} className={selectCls}>
                                {LOCATION_TYPES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                            </select>
                        </Field>
                        <Field label="Country" hint="Leave blank for global opportunities">
                            <input
                                type="text"
                                value={form.country}
                                onChange={(e) => set("country", e.target.value)}
                                placeholder="e.g. Nigeria, Kenya, South Africa"
                                className={inputCls}
                            />
                        </Field>
                    </div>
                </FormSection>

                {/* ── Funding ── */}
                <FormSection title="Funding">
                    <div className="grid gap-5 sm:grid-cols-2">
                        <Field label="Funding Type" required>
                            <select value={form.funding_type} onChange={(e) => set("funding_type", e.target.value)} className={selectCls}>
                                {FUNDING_TYPES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                            </select>
                        </Field>
                        <Field label="Funding Amount" hint="Free-form — e.g. $10,000, €5,000/yr, Full tuition">
                            <input
                                type="text"
                                value={form.funding_amount}
                                onChange={(e) => set("funding_amount", e.target.value)}
                                placeholder="$10,000"
                                className={inputCls}
                            />
                        </Field>
                    </div>
                </FormSection>

                {/* ── Eligibility ── */}
                <FormSection title="Eligibility Requirements">
                    <Field label="General Eligibility" hint="Who is eligible? Citizenship, GPA, etc.">
                        <textarea
                            value={form.eligibility_requirements}
                            onChange={(e) => set("eligibility_requirements", e.target.value)}
                            rows={3}
                            placeholder="e.g. Open to African nationals studying computer science..."
                            className={textareaCls}
                        />
                    </Field>

                    <Field label="Education Requirements" hint="e.g. Bachelor's Degree in Computer Science">
                        <input
                            type="text"
                            value={form.education_requirements}
                            onChange={(e) => set("education_requirements", e.target.value)}
                            placeholder="Bachelor's Degree"
                            className={inputCls}
                        />
                    </Field>

                    <div className="grid gap-5 sm:grid-cols-2">
                        <Field label="Required Skills" hint="Comma-separated — used for AI matching">
                            <input
                                type="text"
                                value={form.required_skills}
                                onChange={(e) => set("required_skills", e.target.value)}
                                placeholder="Python, Machine Learning, Cloud"
                                className={inputCls}
                            />
                        </Field>
                        <Field label="Required Certifications" hint="Comma-separated — e.g. AWS Certified, Google Cloud">
                            <input
                                type="text"
                                value={form.required_certifications}
                                onChange={(e) => set("required_certifications", e.target.value)}
                                placeholder="AWS Solutions Architect, Google Cloud"
                                className={inputCls}
                            />
                        </Field>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-3">
                        <Field label="Min Age" hint="Optional">
                            <input
                                type="number"
                                value={form.age_min}
                                onChange={(e) => set("age_min", e.target.value)}
                                placeholder="18"
                                min={0}
                                className={inputCls}
                            />
                        </Field>
                        <Field label="Max Age" hint="Optional">
                            <input
                                type="number"
                                value={form.age_max}
                                onChange={(e) => set("age_max", e.target.value)}
                                placeholder="35"
                                min={0}
                                className={inputCls}
                            />
                        </Field>
                        <Field label="Min Experience (yrs)">
                            <input
                                type="number"
                                value={form.experience_years_min}
                                onChange={(e) => set("experience_years_min", e.target.value)}
                                placeholder="0"
                                min={0}
                                className={inputCls}
                            />
                        </Field>
                    </div>
                </FormSection>

                {/* ── Matching Weights ── */}
                <FormSection title="AI Matching Configuration">
                    <div className="mb-4 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900/30 dark:bg-blue-900/10">
                        <Info size={16} className="mt-0.5 shrink-0 text-blue-500" />
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                            Define how much each factor contributes to candidate matching. <strong>Weights must sum to 100%.</strong> Currently: <strong className={totalWeight === 100 ? "text-green-600" : "text-red-500"}>{totalWeight}%</strong>
                        </p>
                    </div>
                    <div className="grid gap-6 sm:grid-cols-2">
                        <WeightSlider label="Education Weight" name="weight_education" value={form.weight_education} onChange={handleWeightChange} />
                        <WeightSlider label="Certifications Weight" name="weight_certifications" value={form.weight_certifications} onChange={handleWeightChange} />
                        <WeightSlider label="Skills Weight" name="weight_skills" value={form.weight_skills} onChange={handleWeightChange} />
                        <WeightSlider label="Location Weight" name="weight_location" value={form.weight_location} onChange={handleWeightChange} />
                    </div>
                </FormSection>

                {/* ── Actions ── */}
                <div className="flex items-center justify-between rounded-2xl border border-stone-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-xs text-slate-400">Saved as <strong className="text-slate-600 dark:text-slate-300">Draft</strong> — publish from the opportunities list when ready.</p>
                    <button
                        type="submit"
                        disabled={saving || totalWeight !== 100}
                        className="flex items-center gap-2 rounded-xl bg-[#16324f] px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Sparkles size={16} />
                        {saving ? "Saving…" : "Save Opportunity"}
                    </button>
                </div>
            </form>
        </div>
    );
}
