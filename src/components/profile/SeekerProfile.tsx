"use client";

import { useState } from "react";
import { apiFetch, apiFetchJson } from "@/lib/api";
import { JobSeeker } from "@/types";
import { 
    Camera, Check, Loader2, Plus, Trash2, Award, ExternalLink, 
    UserCircle2, GraduationCap, Settings, ShieldCheck
} from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { seekerProfileSchema, type SeekerProfileValues } from "@/lib/validations/profile";
import { Badge, PageHeader, SectionCard } from "@/components/dashboard/ui";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { EmailPreferences } from "@/components/dashboard/EmailPreferences";
import { useOptionalUser } from "@/context/UserContext";

interface SeekerProfileData extends JobSeeker {
    completion: number;
    searchIntent?: "ACTIVELY_LOOKING" | "OPEN_TO_OFFERS" | "SEEKING_INTERNSHIP" | "NOT_LOOKING";
    search_intent?: "ACTIVELY_LOOKING" | "OPEN_TO_OFFERS" | "SEEKING_INTERNSHIP" | "NOT_LOOKING";
    profileVisibility?: "PUBLIC" | "ANONYMOUS" | "HIDDEN";
    profile_visibility?: "PUBLIC" | "ANONYMOUS" | "HIDDEN";
    publicSlug?: string | null;
    profileViews?: number;
}

interface Certificate {
    id: string;
    title: string;
    issuer: string | null;
    issue_date: string | null;
    credential_url: string | null;
}

type TabType = "basic" | "experience" | "skills" | "preferences";

export default function SeekerProfile({
    initialProfile,
    initialCertificates
}: {
    initialProfile: SeekerProfileData;
    initialCertificates: Certificate[];
}) {
    const profile = initialProfile;
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>("basic");
    const [newSkill, setNewSkill] = useState("");
    const [avatarUrl, setAvatarUrl] = useState<string | null>(initialProfile.avatar_url ?? null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    // Certificates state
    const [certificates, setCertificates] = useState<Certificate[]>(initialCertificates);
    const [newCert, setNewCert] = useState({ title: "", issuer: "", issue_date: "", credential_url: "" });
    const [addingCert, setAddingCert] = useState(false);

    const router = useRouter();
    const userContext = useOptionalUser();

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        control,
        formState: { errors, isDirty },
    } = useForm<SeekerProfileValues>({
        resolver: zodResolver(seekerProfileSchema),
        values: profile ? {
            full_name: profile.full_name ?? "",
            bio: profile.bio ?? "",
            location: profile.location ?? "",
            skills: profile.skills ?? [],
            experience: (profile as any).experience ?? [],
            education: (profile as any).education ?? [],
            qualification: profile.qualification ?? "",
            salaryExpectation: profile.salary_expectation ?? profile.salaryExpectation ?? "",
            seniorityLevel: profile.seniority_level ?? profile.seniorityLevel ?? "",
            employmentType: profile.employment_type ?? profile.employmentType ?? "",
            phone: profile.phone ?? "",
            whatsapp: profile.whatsapp ?? false,
            searchIntent: profile.search_intent ?? profile.searchIntent ?? "ACTIVELY_LOOKING",
            profileVisibility: profile.profile_visibility ?? profile.profileVisibility ?? "HIDDEN",
            employmentStatus: (profile as any).employment_status ?? profile.employmentStatus ?? "",
        } : undefined,
    });

    const { fields, append, remove } = useFieldArray({ control, name: "experience" });
    const { fields: educationFields, append: educationAppend, remove: educationRemove } = useFieldArray({ control, name: "education" });
    const watchedSkills = watch("skills") || [];

    const addSkill = (skill: string) => {
        const trimmed = skill.trim();
        if (!trimmed || watchedSkills.includes(trimmed)) return;
        setValue("skills", [...watchedSkills, trimmed], { shouldDirty: true });
        setNewSkill("");
    };

    const handleAddCertificate = async () => {
        if (!newCert.title) return toast.error("Title is required");
        setAddingCert(true);
        try {
            const res = await apiFetchJson("/api/profile/certificates", {
                method: "POST",
                body: JSON.stringify(newCert)
            });
            setCertificates([res as Certificate, ...certificates]);
            setNewCert({ title: "", issuer: "", issue_date: "", credential_url: "" });
            toast.success("Certificate added");
        } catch (error: any) {
            toast.error(error.message || "Failed to add certificate");
        } finally {
            setAddingCert(false);
        }
    };

    const handleDeleteCertificate = async (id: string) => {
        try {
            await apiFetchJson(`/api/profile/certificates/${id}`, { method: "DELETE" });
            setCertificates(certificates.filter(c => c.id !== id));
            toast.success("Certificate deleted");
        } catch {
            toast.error("Failed to delete certificate");
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingAvatar(true);
        try {
            const formData = new FormData();
            formData.append("avatar", file);
            const res = await apiFetch("/api/profile/avatar", { method: "POST", body: formData });
            const json = await res.json();
            if (res.ok && json.url) {
                setAvatarUrl(json.url);
                router.refresh();
                toast.success("Profile picture updated");
            } else {
                toast.error(json.error || "Upload failed");
            }
        } finally {
            setUploadingAvatar(false);
            e.target.value = "";
        }
    };

    const onSubmit = async (data: SeekerProfileValues) => {
        setSaving(true);
        try {
            await apiFetchJson("/api/profile", { method: "PUT", body: JSON.stringify(data) });
            if (userContext?.refreshUser) {
                await userContext.refreshUser();
            }
            toast.success("Profile updated successfully!");
        } catch (error: any) {
            toast.error(error.message || "Failed to save profile");
        } finally {
            setSaving(false);
        }
    };

    const inputClass = "w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#16324f] focus:ring-1 focus:ring-[#16324f] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-slate-500";
    const standardQualifications = ["High School", "Certificate", "Diploma", "Bachelor's Degree", "Master's Degree", "PhD / Doctorate", "Professional Certification", "Other"];
    const hasGenericQualification = profile.qualification && standardQualifications.includes(profile.qualification);
    const hasDetailedEducation = (profile.education || []).some((entry: any) => {
        const certificate = (entry?.certificate || "").trim();
        const institution = (entry?.institution || "").trim();
        return certificate.length > 0 || institution.length > 0;
    });
    const publicCareerPath = profile.publicSlug ? `/in/${profile.publicSlug}` : profile.id ? `/career/${profile.id}` : null;
    const visibility = profile.profile_visibility ?? profile.profileVisibility;
    const isPublicCareerVisible = visibility === "PUBLIC" || visibility === "ANONYMOUS";

    const tabs = [
        { id: "basic", label: "Basic Info", icon: UserCircle2 },
        { id: "experience", label: "Experience & Education", icon: GraduationCap },
        { id: "skills", label: "Skills & Certs", icon: Award },
        { id: "preferences", label: "Preferences & Privacy", icon: Settings },
    ] as const;

    return (
        <div className="space-y-6 pb-20">
            <PageHeader title="Profile" subtitle="Keep your profile complete, clear, and ready for employers." />

            {/* Mobile & Desktop Responsive Tab Navigation */}
            <div className="no-scrollbar flex overflow-x-auto rounded-2xl border border-stone-200 bg-stone-100/80 p-1.5 dark:border-slate-800 dark:bg-slate-900/80">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id as TabType)}
                            className={`flex flex-1 min-w-[130px] sm:min-w-0 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                                isActive
                                    ? "bg-white text-[#16324f] shadow-sm dark:bg-slate-800 dark:text-white"
                                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                            }`}
                        >
                            <Icon size={16} className={isActive ? "text-[#16324f] dark:text-white" : "text-slate-400"} />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                    <div className="space-y-6">

                        {/* TAB 1: BASIC INFO */}
                        {activeTab === "basic" && (
                            <SectionCard title="Basic Information">
                                <div className="space-y-5 p-4 sm:p-6">
                                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                                        <label className="relative block cursor-pointer">
                                            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-stone-200 bg-stone-50 dark:border-slate-700 dark:bg-slate-900">
                                                {avatarUrl ? (
                                                    <img src={avatarUrl} alt={profile.full_name ?? "Profile"} className="h-full w-full object-cover" />
                                                ) : (
                                                    <span className="text-2xl font-semibold text-[#16324f]">{(profile.full_name || "?")[0]}</span>
                                                )}
                                            </div>
                                            <span className="absolute -bottom-1 -right-1 rounded-full bg-[#16324f] p-2 text-white shadow-md">
                                                {uploadingAvatar ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                                            </span>
                                            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                                        </label>
                                        <div className="text-center sm:text-left">
                                            <p className="text-base font-semibold text-slate-900 dark:text-white">{profile.full_name || "Unnamed profile"}</p>
                                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{profile.location || "No location set"}</p>
                                            <Badge label={`${profile.completion ?? 0}% complete`} variant="blue" className="mt-2" />
                                        </div>
                                    </div>

                                    {(hasGenericQualification || !hasDetailedEducation) && (
                                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                                            Improve job matching: specify your exact qualification title in the Education tab.
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div>
                                            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Full Name *</label>
                                            <input {...register("full_name")} placeholder="Full name" className={inputClass} />
                                            {errors.full_name && <p className="mt-1 text-xs text-red-600">{errors.full_name.message}</p>}
                                        </div>
                                        <div>
                                            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Location</label>
                                            <input {...register("location")} placeholder="e.g. Lilongwe, Malawi" className={inputClass} />
                                            {errors.location && <p className="mt-1 text-xs text-red-600">{errors.location.message}</p>}
                                        </div>
                                        <div>
                                            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Phone / WhatsApp</label>
                                            <input {...register("phone")} placeholder="+265..." className={inputClass} />
                                            {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>}
                                        </div>
                                        <div className="flex items-center gap-2 pt-6">
                                            <input type="checkbox" {...register("whatsapp")} id="whatsapp" className="h-4 w-4 rounded border-stone-300 text-[#16324f]" />
                                            <label htmlFor="whatsapp" className="text-xs font-medium text-slate-600 dark:text-slate-400">Available on WhatsApp</label>
                                        </div>
                                        <div>
                                            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Salary Expectation</label>
                                            <input {...register("salaryExpectation")} placeholder="e.g. MWK 500,000 / mo" className={inputClass} />
                                        </div>
                                        <div>
                                            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Highest Qualification</label>
                                            <select {...register("qualification")} className={inputClass}>
                                                <option value="" disabled>Select highest qualification</option>
                                                {profile && (profile as any).qualification && !standardQualifications.includes((profile as any).qualification) && (
                                                    <option value={(profile as any).qualification}>{(profile as any).qualification}</option>
                                                )}
                                                <option value="Certificate">Certificate</option>
                                                <option value="Diploma">Diploma</option>
                                                <option value="Bachelor's Degree">Bachelor's Degree</option>
                                                <option value="Master's Degree">Master's Degree</option>
                                                <option value="PhD / Doctorate">PhD / Doctorate</option>
                                                <option value="Professional Certification">Professional Certification</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Seniority Level</label>
                                            <select {...register("seniorityLevel")} className={inputClass}>
                                                <option value="" disabled>Select seniority level</option>
                                                {(profile?.seniority_level || profile?.seniorityLevel) && !["Intern", "Junior", "Mid-Level", "Senior", "Lead", "Executive"].includes((profile.seniority_level || profile.seniorityLevel)!) && (
                                                    <option value={(profile.seniority_level || profile.seniorityLevel)!}>{profile.seniority_level || profile.seniorityLevel}</option>
                                                )}
                                                <option value="Intern">Intern</option>
                                                <option value="Junior">Junior</option>
                                                <option value="Mid-Level">Mid-Level</option>
                                                <option value="Senior">Senior</option>
                                                <option value="Lead">Lead</option>
                                                <option value="Executive">Executive</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Employment Type</label>
                                            <select {...register("employmentType")} className={inputClass}>
                                                <option value="" disabled>Select employment type</option>
                                                {(profile?.employment_type || profile?.employmentType) && !["Full-time", "Part-time", "Contract", "Freelance", "Internship"].includes((profile.employment_type || profile.employmentType)!) && (
                                                    <option value={(profile.employment_type || profile.employmentType)!}>{profile.employment_type || profile.employmentType}</option>
                                                )}
                                                <option value="Full-time">Full-time</option>
                                                <option value="Part-time">Part-time</option>
                                                <option value="Contract">Contract</option>
                                                <option value="Freelance">Freelance</option>
                                                <option value="Internship">Internship</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Short Bio / Professional Summary</label>
                                        <textarea {...register("bio")} rows={4} placeholder="Brief summary of your background and career goals..." className={`${inputClass} resize-y`} />
                                        {errors.bio && <p className="mt-1 text-xs text-red-600">{errors.bio.message}</p>}
                                    </div>
                                </div>
                            </SectionCard>
                        )}

                        {/* TAB 2: EXPERIENCE & EDUCATION */}
                        {activeTab === "experience" && (
                            <div className="space-y-6">
                                <SectionCard title="Education">
                                    <div className="space-y-4 p-4 sm:p-6">
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            Add your specific qualification title and institution for stronger job matching (e.g. “Bachelors Degree in Business Administration” or “Diploma in Accounting”).
                                        </p>
                                        {educationFields.map((field, index) => (
                                            <div key={field.id} className="rounded-2xl border border-stone-200 bg-stone-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                                    <input {...register(`education.${index}.certificate`)} placeholder="Qualification / Degree Title" className={inputClass} />
                                                    <input {...register(`education.${index}.institution`)} placeholder="Institution / College" className={inputClass} />
                                                    <input {...register(`education.${index}.startDate`)} placeholder="Start date (e.g. 2020)" className={inputClass} />
                                                    <input {...register(`education.${index}.endDate`)} placeholder="End date (or Expected)" className={inputClass} />
                                                </div>
                                                <button type="button" onClick={() => educationRemove(index)} className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-red-600 hover:underline">
                                                    <Trash2 size={14} />
                                                    Remove Education
                                                </button>
                                            </div>
                                        ))}
                                        <button type="button" onClick={() => educationAppend({ certificate: "", institution: "", startDate: "", endDate: "" })} className="inline-flex items-center gap-2 text-xs font-bold text-[#16324f] hover:underline dark:text-slate-200">
                                            <Plus size={16} />
                                            Add education entry
                                        </button>
                                    </div>
                                </SectionCard>

                                <SectionCard title="Work Experience">
                                    <div className="space-y-4 p-4 sm:p-6">
                                        {fields.map((field, index) => (
                                            <div key={field.id} className="rounded-2xl border border-stone-200 bg-stone-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                                    <input {...register(`experience.${index}.role`)} placeholder="Job Role / Title" className={inputClass} />
                                                    <input {...register(`experience.${index}.company`)} placeholder="Company / Organization" className={inputClass} />
                                                    <input {...register(`experience.${index}.startDate`)} placeholder="Start date" className={inputClass} />
                                                    <input {...register(`experience.${index}.endDate`)} placeholder="End date (or Present)" className={inputClass} />
                                                    <div className="md:col-span-2">
                                                        <textarea {...register(`experience.${index}.description`)} rows={3} placeholder="Key responsibilities and achievements..." className={`${inputClass} resize-y`} />
                                                    </div>
                                                </div>
                                                <button type="button" onClick={() => remove(index)} className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-red-600 hover:underline">
                                                    <Trash2 size={14} />
                                                    Remove Role
                                                </button>
                                            </div>
                                        ))}
                                        <button type="button" onClick={() => append({ role: "", company: "", startDate: "", description: "" })} className="inline-flex items-center gap-2 text-xs font-bold text-[#16324f] hover:underline dark:text-slate-200">
                                            <Plus size={16} />
                                            Add experience entry
                                        </button>
                                    </div>
                                </SectionCard>
                            </div>
                        )}

                        {/* TAB 3: SKILLS & CERTS */}
                        {activeTab === "skills" && (
                            <div className="space-y-6">
                                <SectionCard title="Skills">
                                    <div className="space-y-4 p-4 sm:p-6">
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            Add relevant skills to boost your match scores with employers looking for specific capabilities.
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {watchedSkills.length > 0 ? watchedSkills.map((skill) => (
                                                <Badge key={skill} variant="secondary" className="gap-2 text-xs py-1 px-2.5">
                                                    {skill}
                                                    <button type="button" onClick={() => setValue("skills", watchedSkills.filter((s) => s !== skill), { shouldDirty: true })}>
                                                        <Trash2 size={12} className="hover:text-red-500" />
                                                    </button>
                                                </Badge>
                                            )) : <p className="text-sm text-slate-500 dark:text-slate-400">No skills added yet.</p>}
                                        </div>
                                        <div className="flex gap-2 pt-2">
                                            <input 
                                                value={newSkill} 
                                                onChange={(e) => setNewSkill(e.target.value)} 
                                                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill(newSkill))} 
                                                placeholder="Add a skill (e.g. Project Management, React)" 
                                                className={inputClass} 
                                            />
                                            <button type="button" onClick={() => addSkill(newSkill)} className="rounded-xl bg-[#16324f] px-5 py-3 text-xs font-bold text-white hover:opacity-90 shrink-0">
                                                Add
                                            </button>
                                        </div>
                                    </div>
                                </SectionCard>

                                <SectionCard title="Certifications">
                                    <div className="space-y-4 p-4 sm:p-6">
                                        {certificates.length > 0 ? (
                                            <div className="space-y-3">
                                                {certificates.map((cert) => (
                                                    <div key={cert.id} className="flex items-start justify-between rounded-2xl border border-stone-200 bg-stone-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                                                        <div className="flex items-start gap-3 min-w-0">
                                                            <div className="mt-1 rounded-full bg-stone-200 p-1.5 dark:bg-slate-800 shrink-0">
                                                                <Award size={16} className="text-slate-600 dark:text-slate-400" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <h4 className="font-semibold text-slate-900 dark:text-white truncate">{cert.title}</h4>
                                                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{cert.issuer || "Unknown Issuer"} {cert.issue_date && `• ${new Date(cert.issue_date).getFullYear()}`}</p>
                                                                {cert.credential_url && (
                                                                    <a href={cert.credential_url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400">
                                                                        View Credential <ExternalLink size={10} />
                                                                    </a>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <button type="button" onClick={() => handleDeleteCertificate(cert.id)} className="text-slate-400 hover:text-red-500 p-1">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-slate-500 dark:text-slate-400">No certifications added yet.</p>
                                        )}

                                        <div className="mt-4 rounded-2xl border border-dashed border-stone-300 p-4 dark:border-slate-700">
                                            <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Add New Certification</h4>
                                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                                <input value={newCert.title} onChange={e => setNewCert({ ...newCert, title: e.target.value })} placeholder="Title *" className={inputClass} />
                                                <input value={newCert.issuer} onChange={e => setNewCert({ ...newCert, issuer: e.target.value })} placeholder="Issuer (e.g. Coursera)" className={inputClass} />
                                                <input type="date" value={newCert.issue_date} onChange={e => setNewCert({ ...newCert, issue_date: e.target.value })} className={inputClass} />
                                                <input value={newCert.credential_url} onChange={e => setNewCert({ ...newCert, credential_url: e.target.value })} placeholder="Credential URL" className={inputClass} />
                                            </div>
                                            <button type="button" onClick={handleAddCertificate} disabled={addingCert || !newCert.title} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#16324f] px-4 py-2.5 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50">
                                                {addingCert ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                                                Add Certificate
                                            </button>
                                        </div>
                                    </div>
                                </SectionCard>
                            </div>
                        )}

                        {/* TAB 4: PREFERENCES & PRIVACY */}
                        {activeTab === "preferences" && (
                            <SectionCard title="Marketplace & Privacy Preferences">
                                <div className="space-y-4 p-4 sm:p-6">
                                    <div>
                                        <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Profile Visibility</label>
                                        <select {...register("profileVisibility")} className={inputClass}>
                                            <option value="PUBLIC">Public (Employers can see your full profile)</option>
                                            <option value="ANONYMOUS">Anonymous (Employers see skills/experience but hide name & photo)</option>
                                            <option value="HIDDEN">Hidden (You will not appear in employer search)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Current Employment Situation</label>
                                        <select {...register("employmentStatus")} className={inputClass}>
                                            <option value="">Select your current situation</option>
                                            <option value="EMPLOYED_FULL_TIME">Employed (Full-time)</option>
                                            <option value="EMPLOYED_PART_TIME">Employed (Part-time)</option>
                                            <option value="UNEMPLOYED">Not Currently Employed</option>
                                            <option value="FREELANCING">Freelancing / Self-employed</option>
                                            <option value="STUDENT">Student</option>
                                            <option value="RECENT_GRADUATE">Recent Graduate</option>
                                            <option value="BETWEEN_JOBS">Between Jobs</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Current Job Search Intent</label>
                                        <select {...register("searchIntent")} className={inputClass}>
                                            <option value="ACTIVELY_LOOKING">Actively looking for jobs</option>
                                            <option value="OPEN_TO_OFFERS">Open to offers</option>
                                            <option value="SEEKING_INTERNSHIP">Seeking an internship or attachment</option>
                                            <option value="NOT_LOOKING">Not looking</option>
                                        </select>
                                    </div>
                                </div>
                            </SectionCard>
                        )}

                        {/* Sticky / Persistent Save Action Bar */}
                        <div className="sticky bottom-4 z-10 flex items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-white/95 p-4 shadow-lg backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
                                <span className="hidden sm:inline">{isDirty ? "Unsaved changes on form" : "Profile up to date"}</span>
                            </div>
                            <button 
                                type="submit" 
                                disabled={saving || !isDirty} 
                                className="inline-flex items-center gap-2 rounded-xl bg-[#16324f] px-5 py-3 text-xs font-bold text-white shadow-md hover:opacity-90 disabled:opacity-50 transition-all active:scale-95"
                            >
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                {saving ? "Saving Changes..." : "Save Profile Changes"}
                            </button>
                        </div>

                    </div>

                    {/* Sidebar Overview */}
                    <div className="space-y-6">
                        <SectionCard title="Quick Status">
                            <div className="space-y-3 p-6 text-sm text-slate-600 dark:text-slate-400">
                                <p className="flex justify-between items-center">
                                    Completion: 
                                    <span className="font-bold text-slate-900 dark:text-white">{profile.completion ?? 0}%</span>
                                </p>
                                <p className="flex justify-between items-center">
                                    Skills: 
                                    <span className="font-bold text-slate-900 dark:text-white">{watchedSkills.length} added</span>
                                </p>
                                <p className="flex justify-between items-center">
                                    Status: 
                                    <span className="font-bold text-slate-900 dark:text-white truncate max-w-[150px] text-right">
                                        {profile.employmentStatus ? profile.employmentStatus.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) : "Not set"}
                                    </span>
                                </p>
                                <div className="mt-4 border-t border-stone-200 pt-3 dark:border-slate-800">
                                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Public career page</p>
                                    {publicCareerPath && isPublicCareerVisible ? (
                                        <a href={publicCareerPath} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-2 text-xs font-bold text-[#16324f] hover:underline dark:text-slate-100">
                                            View share page <ExternalLink size={14} />
                                        </a>
                                    ) : (
                                        <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">Set visibility to Public or Anonymous to activate your share page.</p>
                                    )}
                                </div>
                                <div className="mt-4 border-t border-stone-200 pt-3 dark:border-slate-800">
                                    <p className="flex items-center justify-between text-xs font-medium">
                                        Profile Views
                                        <span className="rounded-full bg-blue-100 px-2.5 py-0.5 font-bold text-blue-700 dark:bg-blue-900/50 dark:text-blue-400">
                                            {(profile as any).profile_views || profile.profileViews || 0}
                                        </span>
                                    </p>
                                </div>
                            </div>
                        </SectionCard>

                        <EmailPreferences />
                    </div>
                </div>
            </form>
        </div>
    );
}