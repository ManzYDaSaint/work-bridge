import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Briefcase, Building2, CalendarDays, CheckCircle2, DollarSign, ExternalLink, MapPin, ShieldCheck, Users } from "lucide-react";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { formatJobType, formatWorkMode } from "@/lib/utils";
import ShareJobButton from "@/components/jobs/ShareJobButton";
import ApplyActionButton from "@/components/jobs/ApplyActionButton";

// Revalidate every 10 minutes — much better than force-dynamic for crawlers
export const revalidate = 600;

type PublicJob = {
    id: string;
    employer_id: string;
    title: string;
    description: string | null;
    location: string;
    type: string;
    work_mode: string | null;
    skills: string[] | null;
    must_have_skills: string[] | null;
    nice_to_have_skills: string[] | null;
    minimum_years_experience: number | null;
    qualification: string | null;
    salary_range: string | null;
    deadline: string | null;
    status: string;
    public_slug: string | null;
    created_at: string;
    // V2 architecture fields
    application_method: string | null;
    external_apply_url: string | null;
    apply_email: string | null;
    apply_whatsapp: string | null;
    apply_phone: string | null;
    application_instructions: string | null;
    allow_one_tap_apply: boolean | null;
    posting_type: string | null;
    display_company_name: string | null;
    job_source: string | null;
};

type PublicEmployer = {
    id: string;
    company_name: string;
    industry: string | null;
    location: string | null;
    website: string | null;
    description: string | null;
    logo_url: string | null;
    recruiter_verified: boolean | null;
};

function looksLikeUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

async function getPublicJob(slugOrId: string) {
    const supabase = getSupabaseAdminClient();
    if (!supabase) return null;

    const { data } = await supabase
        .from("jobs")
        .select("id, employer_id, title, description, location, type, work_mode, skills, must_have_skills, nice_to_have_skills, minimum_years_experience, qualification, salary_range, deadline, status, public_slug, created_at, application_method, external_apply_url, apply_email, apply_whatsapp, apply_phone, application_instructions, allow_one_tap_apply, posting_type, display_company_name, job_source")
        .eq(looksLikeUuid(slugOrId) ? "id" : "public_slug", slugOrId)
        .maybeSingle();

    const job = data as PublicJob | null;
    if (!job || job.status !== "ACTIVE") return null;

    const { data: employerData } = await supabase
        .from("employers")
        .select("id, company_name, industry, location, website, description, logo_url, recruiter_verified")
        .eq("id", job.employer_id)
        .maybeSingle();

    return {
        job,
        employer: employerData as PublicEmployer | null,
    };
}

function formatDate(value: string | null) {
    if (!value) return "Open ended";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

function uniqueList(values: Array<string | null | undefined>) {
    return [...new Set(values.filter(Boolean) as string[])];
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    const result = await getPublicJob(id);

    if (!result) {
        return {
            title: "Job not found | Aganyu",
            robots: { index: false, follow: false },
        };
    }

    const company = result.employer?.company_name || "Aganyu employer";
    const description = result.job.description || `${company} is hiring ${result.job.title} on Aganyu.`;

    return {
        title: `${result.job.title} at ${company} | Aganyu`,
        description,
        openGraph: {
            title: `${result.job.title} at ${company}`,
            description,
            type: "article",
            images: [{ url: `/api/og/job/${result.job.id}` }],
        },
        twitter: {
            card: "summary_large_image",
            title: `${result.job.title} at ${company}`,
            description,
            images: [`/api/og/job/${result.job.id}`],
        },
    };
}

export default async function PublicJobPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const result = await getPublicJob(id);
    if (!result) notFound();

    const { job, employer } = result;
    // display_company_name overrides the employer account name
    const company = job.display_company_name || employer?.company_name || "Aganyu employer";
    const isAgencyPosting = job.posting_type === "AGENCY" || job.posting_type === "AGANYU";
    const skills = uniqueList([...(job.must_have_skills || []), ...(job.skills || []), ...(job.nice_to_have_skills || [])]);
    const applyHref = `/jobs?job=${job.id}`;
    const siteUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://aganyu.com").replace(/\/$/, "");
    const sharePath = `${siteUrl}/jobs/${job.public_slug || job.id}`;

    const jobPostingSchema = {
        "@context": "https://schema.org",
        "@type": "JobPosting",
        title: job.title,
        description: job.description || `${company} is hiring a ${job.title}.`,
        datePosted: job.created_at,
        validThrough: job.deadline || undefined,
        employmentType: job.type === "FULL_TIME" ? "FULL_TIME" : job.type === "PART_TIME" ? "PART_TIME" : job.type === "CONTRACT" ? "CONTRACTOR" : "INTERN",
        hiringOrganization: {
            "@type": "Organization",
            name: company,
            sameAs: employer?.website || undefined,
            logo: employer?.logo_url || undefined,
        },
        jobLocation: {
            "@type": "Place",
            address: {
                "@type": "PostalAddress",
                addressLocality: job.location,
                addressCountry: "MW",
            },
        },
        jobLocationType:
            job.work_mode === "REMOTE" ? "TELECOMMUTE" : undefined,
        baseSalary: job.salary_range
            ? { "@type": "MonetaryAmount", description: job.salary_range }
            : undefined,
        skills: skills.join(", ") || undefined,
        url: sharePath,
        directApply: job.allow_one_tap_apply !== false,
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPostingSchema) }}
            />
            <div className="min-h-screen bg-[#f7f3ea] text-slate-900 dark:bg-slate-950 dark:text-white">
            <section className="border-b border-stone-200 bg-white/80 dark:border-slate-800 dark:bg-slate-950/80">
                <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
                    <Link href="/jobs" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white">
                        <ArrowLeft size={16} /> All jobs
                    </Link>

                    <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-[#16324f] px-3 py-1 text-xs font-semibold text-white">{formatWorkMode(job.work_mode)}</span>
                                <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">{formatJobType(job.type)}</span>
                                {employer?.recruiter_verified && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
                                        <ShieldCheck size={13} /> Verified recruiter
                                    </span>
                                )}
                            </div>
                            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-5xl">{job.title}</h1>
                            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600 dark:text-slate-300">
                                <span className="inline-flex items-center gap-1.5"><Building2 size={15} /> {company}</span>
                                <span className="inline-flex items-center gap-1.5"><MapPin size={15} /> {job.location}</span>
                                <span className="inline-flex items-center gap-1.5"><CalendarDays size={15} /> Deadline: {formatDate(job.deadline)}</span>
                            </div>
                        </div>

                        <aside className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <h2 className="text-sm font-semibold text-slate-950 dark:text-white">Job snapshot</h2>
                            <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                                <p className="flex items-center gap-2"><Briefcase size={15} /> {formatJobType(job.type)}</p>
                                <p className="flex items-center gap-2"><MapPin size={15} /> {formatWorkMode(job.work_mode)}</p>
                                <p className="flex items-center gap-2"><DollarSign size={15} /> {job.salary_range || "Compensation not specified"}</p>
                                {job.minimum_years_experience != null && <p>{job.minimum_years_experience}+ years experience</p>}
                                {job.qualification && <p>{job.qualification}</p>}
                            </div>
                            <div className="mt-5">
                                <ApplyActionButton
                                    jobId={job.id}
                                    jobTitle={job.title}
                                    applicationMethod={(job.application_method as any) || "one_tap"}
                                    externalApplyUrl={job.external_apply_url}
                                    applyEmail={job.apply_email}
                                    applyWhatsapp={job.apply_whatsapp}
                                    applyPhone={job.apply_phone}
                                    applicationInstructions={job.application_instructions}
                                    allowOneTapApply={job.allow_one_tap_apply !== false}
                                    applyHref={applyHref}
                                />
                            </div>
                        </aside>
                    </div>
                </div>
            </section>

            <section className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8">
                <div className="space-y-6">
                    <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <h2 className="text-lg font-semibold">About this role</h2>
                        <div className="mt-4 whitespace-pre-line text-base leading-relaxed text-slate-700 dark:text-slate-300">
                            {job.description || "No description has been added yet."}
                        </div>
                    </section>

                    <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <h2 className="text-lg font-semibold">Skills and requirements</h2>
                        <div className="mt-4 flex flex-wrap gap-2">
                            {skills.length > 0 ? skills.map((skill) => (
                                <span key={skill} className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">{skill}</span>
                            )) : <p className="text-sm text-slate-500">No skills listed yet.</p>}
                        </div>
                    </section>
                </div>

                <aside className="space-y-6">
                    <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <h2 className="text-lg font-semibold">
                            {isAgencyPosting ? "Hiring Company" : "Company"}
                        </h2>
                        <div className="mt-4 flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-stone-200 bg-stone-100 text-sm font-semibold text-[#16324f] dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                                {employer?.logo_url ? <img src={employer.logo_url} alt={company} className="h-full w-full object-cover" /> : company.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                                <p className="font-semibold text-slate-950 dark:text-white">{company}</p>
                                {employer?.industry && <p className="text-sm text-slate-500 dark:text-slate-400">{employer.industry}</p>}
                            </div>
                        </div>
                        {employer?.description && <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">{employer.description}</p>}
                        {employer?.website && (
                            <a href={employer.website} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#16324f] hover:underline dark:text-slate-100">
                                Visit website <ExternalLink size={14} />
                            </a>
                        )}

                        {/* Recruitment Partner section for Agency / Aganyu postings */}
                        {isAgencyPosting && (
                            <div className="mt-5 border-t border-stone-200 pt-4 dark:border-slate-700">
                                <div className="flex items-center gap-2">
                                    <Users size={14} className="text-slate-400" />
                                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                                        {job.posting_type === "AGANYU" ? "Posted by" : "Recruitment Partner"}
                                    </p>
                                </div>
                                <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                                    {employer?.company_name || "Aganyu Recruitment"}
                                </p>
                                <p className="text-xs text-slate-400 dark:text-slate-500">
                                    {job.posting_type === "AGANYU"
                                        ? "Aganyu is recruiting on behalf of the hiring company."
                                        : "A certified recruitment partner is managing this vacancy."}
                                </p>
                            </div>
                        )}
                    </section>

                    <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex items-start gap-3">
                            <CheckCircle2 className="mt-0.5 text-emerald-600" size={18} />
                            <div className="flex-1 min-w-0">
                                <h2 className="font-semibold text-slate-950 dark:text-white">Shareable job link</h2>
                                <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">Send this page to candidates or post it anywhere. Applicants can open the job directly.</p>
                                <p className="mt-3 break-all rounded-lg bg-stone-50 px-3 py-2 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-300">{sharePath}</p>
                                <div className="mt-4">
                                    <ShareJobButton
                                        jobId={job.id}
                                        jobTitle={job.title}
                                        publicSlug={job.public_slug || undefined}
                                        companyName={company}
                                        location={job.location}
                                        workMode={job.work_mode || undefined}
                                        salaryRange={job.salary_range || undefined}
                                        jobType={job.type}
                                    />
                                </div>
                            </div>
                        </div>
                    </section>
                </aside>
            </section>
        </div>
        </>
    );
}
