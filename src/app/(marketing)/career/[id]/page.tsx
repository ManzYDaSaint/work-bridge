import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, BriefcaseBusiness, ExternalLink, GraduationCap, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type Visibility = "PUBLIC" | "ANONYMOUS" | "HIDDEN";

type CareerProfile = {
    id: string;
    full_name: string;
    bio: string | null;
    location: string | null;
    skills: string[] | null;
    experience: Array<Record<string, string>> | null;
    education: Array<Record<string, string>> | null;
    qualification: string | null;
    avatar_url: string | null;
    salary_expectation: string | null;
    seniority_level: string | null;
    employment_type: string | null;
    has_badge: boolean | null;
    search_intent: string | null;
    profile_visibility: Visibility | string | null;
    portfolio_links: string[] | null;
};

type Certificate = {
    id: string;
    title: string;
    issuer: string | null;
    issue_date: string | null;
    credential_url: string | null;
    is_verified: boolean | null;
};

const intentLabels: Record<string, string> = {
    ACTIVELY_LOOKING: "Actively looking",
    OPEN_TO_OFFERS: "Open to offers",
    SEEKING_INTERNSHIP: "Seeking internship",
    NOT_LOOKING: "Not currently looking",
};

async function getCareerProfile(id: string) {
    const supabase = getSupabaseAdminClient();
    if (!supabase) return null;

    const { data } = await supabase
        .from("job_seekers")
        .select("id, full_name, bio, location, skills, experience, education, qualification, avatar_url, salary_expectation, seniority_level, employment_type, has_badge, search_intent, profile_visibility, portfolio_links")
        .eq("id", id)
        .maybeSingle();

    const profile = data as CareerProfile | null;
    if (!profile || profile.profile_visibility === "HIDDEN") return null;

    const { data: certificates } = await supabase
        .from("certificates")
        .select("id, title, issuer, issue_date, credential_url, is_verified")
        .eq("seeker_id", id)
        .order("created_at", { ascending: false });

    return {
        profile,
        certificates: (certificates || []) as Certificate[],
    };
}

function cleanList(values?: string[] | null) {
    return (values || []).filter(Boolean);
}

function year(value?: string | null) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : String(date.getFullYear());
}

function hostName(url: string) {
    try {
        return new URL(url).hostname.replace(/^www\./, "");
    } catch {
        return url;
    }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    const result = await getCareerProfile(id);

    if (!result) {
        return {
            title: "Career profile not found | Aganyu",
            robots: { index: false, follow: false },
        };
    }

    const isAnonymous = result.profile.profile_visibility === "ANONYMOUS";
    const name = isAnonymous ? "Aganyu Candidate" : result.profile.full_name;
    const description = result.profile.bio || `${name} career profile on Aganyu.`;

    return {
        title: `${name} | Aganyu Career Profile`,
        description,
        openGraph: {
            title: `${name} | Aganyu Career Profile`,
            description,
            type: "profile",
            images: result.profile.avatar_url && !isAnonymous ? [{ url: result.profile.avatar_url }] : [{ url: "/og-image.png" }],
        },
        twitter: {
            card: "summary_large_image",
            title: `${name} | Aganyu Career Profile`,
            description,
            images: result.profile.avatar_url && !isAnonymous ? [result.profile.avatar_url] : ["/og-image.png"],
        },
    };
}

export default async function CareerPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const result = await getCareerProfile(id);
    if (!result) notFound();

    const { profile, certificates } = result;
    const isAnonymous = profile.profile_visibility === "ANONYMOUS";
    const displayName = isAnonymous ? "Anonymous Candidate" : profile.full_name;
    const initials = displayName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "WB";
    const skills = cleanList(profile.skills);
    const portfolioLinks = isAnonymous ? [] : cleanList(profile.portfolio_links);
    const experience = profile.experience || [];
    const education = profile.education || [];
    const status = profile.search_intent ? intentLabels[profile.search_intent] || profile.search_intent.replaceAll("_", " ").toLowerCase() : "Career profile";

    return (
        <div className="min-h-screen bg-[#f7f3ea] text-slate-900 dark:bg-slate-950 dark:text-white">
            <section className="border-b border-stone-200 bg-white/70 dark:border-slate-800 dark:bg-slate-950/80">
                <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8 lg:py-16">
                    <div className="min-w-0">
                        <div className="mb-6 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#16324f] px-3 py-1 text-xs font-semibold text-white">
                                <Sparkles size={13} /> Aganyu career page
                            </span>
                            {profile.has_badge && (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
                                    <ShieldCheck size={13} /> Verified profile
                                </span>
                            )}
                        </div>

                        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-stone-200 bg-stone-100 text-3xl font-semibold text-[#16324f] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
                                {!isAnonymous && profile.avatar_url ? (
                                    <img src={profile.avatar_url} alt={displayName} className="h-full w-full object-cover" />
                                ) : (
                                    initials
                                )}
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{status}</p>
                                <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-5xl">{displayName}</h1>
                                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600 dark:text-slate-300">
                                    {profile.location && !isAnonymous && <span className="inline-flex items-center gap-1.5"><MapPin size={15} /> {profile.location}</span>}
                                    {profile.seniority_level && <span>{profile.seniority_level}</span>}
                                    {profile.employment_type && <span>{profile.employment_type}</span>}
                                </div>
                            </div>
                        </div>

                        {profile.bio && (
                            <p className="mt-8 max-w-3xl text-lg leading-8 text-slate-700 dark:text-slate-300">{profile.bio}</p>
                        )}
                    </div>

                    <aside className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <h2 className="text-sm font-semibold text-slate-950 dark:text-white">Career snapshot</h2>
                        <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                            {profile.qualification && <p><span className="font-medium text-slate-950 dark:text-white">Qualification:</span> {profile.qualification}</p>}
                            {profile.salary_expectation && !isAnonymous && <p><span className="font-medium text-slate-950 dark:text-white">Expectation:</span> {profile.salary_expectation}</p>}
                            <p><span className="font-medium text-slate-950 dark:text-white">Skills:</span> {skills.length}</p>
                            <p><span className="font-medium text-slate-950 dark:text-white">Experience entries:</span> {experience.length}</p>
                        </div>
                        <Link href="/register?role=employer" className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-[#16324f] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0f2439]">
                            Contact through Aganyu
                        </Link>
                    </aside>
                </div>
            </section>

            <section className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8">
                <div className="space-y-6">
                    <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <h2 className="text-lg font-semibold">Skills</h2>
                        <div className="mt-4 flex flex-wrap gap-2">
                            {skills.length > 0 ? skills.map((skill) => (
                                <span key={skill} className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">{skill}</span>
                            )) : <p className="text-sm text-slate-500">No skills listed yet.</p>}
                        </div>
                    </section>

                    <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex items-center gap-2">
                            <BriefcaseBusiness size={18} className="text-[#16324f] dark:text-slate-200" />
                            <h2 className="text-lg font-semibold">Experience</h2>
                        </div>
                        <div className="mt-5 space-y-4">
                            {experience.length > 0 ? experience.map((item, index) => (
                                <article key={`${item.role}-${index}`} className="border-l-2 border-stone-200 pl-4 dark:border-slate-700">
                                    <h3 className="font-semibold text-slate-950 dark:text-white">{item.role || "Role"}</h3>
                                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.company || "Company"} {item.startDate && `• ${item.startDate}${item.endDate ? ` - ${item.endDate}` : " - Present"}`}</p>
                                    {item.description && <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">{item.description}</p>}
                                </article>
                            )) : <p className="text-sm text-slate-500">No experience listed yet.</p>}
                        </div>
                    </section>

                    <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex items-center gap-2">
                            <GraduationCap size={18} className="text-[#16324f] dark:text-slate-200" />
                            <h2 className="text-lg font-semibold">Education</h2>
                        </div>
                        <div className="mt-5 space-y-4">
                            {education.length > 0 ? education.map((item, index) => (
                                <article key={`${item.certificate}-${index}`} className="border-l-2 border-stone-200 pl-4 dark:border-slate-700">
                                    <h3 className="font-semibold text-slate-950 dark:text-white">{item.certificate || "Qualification"}</h3>
                                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.institution || "Institution"} {item.startDate && `• ${item.startDate}${item.endDate ? ` - ${item.endDate}` : ""}`}</p>
                                </article>
                            )) : <p className="text-sm text-slate-500">No education listed yet.</p>}
                        </div>
                    </section>
                </div>

                <aside className="space-y-6">
                    <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex items-center gap-2">
                            <Award size={18} className="text-[#16324f] dark:text-slate-200" />
                            <h2 className="text-lg font-semibold">Certifications</h2>
                        </div>
                        <div className="mt-4 space-y-3">
                            {certificates.length > 0 ? certificates.map((cert) => (
                                <div key={cert.id} className="rounded-xl border border-stone-200 bg-stone-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                                    <p className="text-sm font-semibold text-slate-950 dark:text-white">{cert.title}</p>
                                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{cert.issuer || "Issuer"}{year(cert.issue_date) ? ` • ${year(cert.issue_date)}` : ""}</p>
                                    {cert.credential_url && (
                                        <a href={cert.credential_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#16324f] hover:underline dark:text-slate-200">
                                            View credential <ExternalLink size={12} />
                                        </a>
                                    )}
                                </div>
                            )) : <p className="text-sm text-slate-500">No certifications listed yet.</p>}
                        </div>
                    </section>

                    {portfolioLinks.length > 0 && (
                        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <h2 className="text-lg font-semibold">Links</h2>
                            <div className="mt-4 space-y-2">
                                {portfolioLinks.map((link) => (
                                    <a key={link} href={link} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-stone-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                                        <span className="truncate">{hostName(link)}</span>
                                        <ExternalLink size={14} />
                                    </a>
                                ))}
                            </div>
                        </section>
                    )}
                </aside>
            </section>
        </div>
    );
}
