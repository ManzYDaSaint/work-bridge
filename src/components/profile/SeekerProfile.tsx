"use client";

import { useEffect, useState } from "react";
import { apiFetch, apiFetchJson } from "@/lib/api";
import { JobSeeker } from "@/types";
import { Camera, Check, Loader2, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { seekerProfileSchema, type SeekerProfileValues } from "@/lib/validations/profile";
import { useFieldArray } from "react-hook-form";
import { Badge, PageHeader, SectionCard } from "@/components/dashboard/ui";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface SeekerProfileData extends JobSeeker {
    completion: number;
}

export default function SeekerProfile() {
    const [profile, setProfile] = useState<SeekerProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [newSkill, setNewSkill] = useState("");
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const router = useRouter();

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
            salaryExpectation: profile.salaryExpectation ?? "",
            seniorityLevel: profile.seniorityLevel ?? "",
            employmentType: profile.employmentType ?? "",
            phone: profile.phone ?? "",
            whatsapp: profile.whatsapp ?? false,
        } : undefined,
    });

    const { fields, append, remove } = useFieldArray({ control, name: "experience" });
    const { fields: educationFields, append: educationAppend, remove: educationRemove } = useFieldArray({ control, name: "education" });
    const watchedSkills = watch("skills") || [];

    const fetchProfile = async () => {
        try {
            const res = await apiFetch("/api/profile");
            const data: SeekerProfileData = await res.json();
            setProfile(data);
            setAvatarUrl((data as any).avatarUrl ?? null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    const addSkill = (skill: string) => {
        const trimmed = skill.trim();
        if (!trimmed || watchedSkills.includes(trimmed)) return;
        setValue("skills", [...watchedSkills, trimmed], { shouldDirty: true });
        setNewSkill("");
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
            await fetchProfile();
            router.refresh();
            toast.success("Profile updated");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#16324f]" />
            </div>
        );
    }

    if (!profile) return null;

    const inputClass = "w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-stone-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white";

    return (
        <div className="space-y-6 pb-20">
            <PageHeader title="Profile" subtitle="Keep your profile complete, clear, and ready to send." />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                <div className="space-y-6">
                    <SectionCard title="Profile details">
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 p-6">
                            <div className="flex items-center gap-4">
                                <label className="relative block cursor-pointer">
                                    <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-stone-200 bg-stone-50 dark:border-slate-700 dark:bg-slate-900">
                                        {avatarUrl ? <img src={avatarUrl} alt={profile.full_name ?? "Profile"} className="h-full w-full object-cover" /> : <span className="text-2xl font-semibold text-[#16324f]">{(profile.full_name || "?")[0]}</span>}
                                    </div>
                                    <span className="absolute -bottom-1 -right-1 rounded-full bg-[#16324f] p-2 text-white">
                                        {uploadingAvatar ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                                    </span>
                                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                                </label>
                                <div>
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{profile.full_name || "Unnamed profile"}</p>
                                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{profile.location || "No location set"}</p>
                                    <Badge label={`${profile.completion ?? 0}% complete`} variant="blue" className="mt-2" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <input {...register("full_name")} placeholder="Full name" className={inputClass} />
                                    {errors.full_name && <p className="mt-1 text-xs text-red-600">{errors.full_name.message}</p>}
                                </div>
                                <div>
                                    <input {...register("location")} placeholder="Location" className={inputClass} />
                                    {errors.location && <p className="mt-1 text-xs text-red-600">{errors.location.message}</p>}
                                </div>
                                <div>
                                    <input {...register("phone")} placeholder="Phone / WhatsApp (+265...)" className={inputClass} />
                                    {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>}
                                </div>
                                <div className="flex items-center gap-2 px-2">
                                    <input type="checkbox" {...register("whatsapp")} id="whatsapp" className="h-4 w-4 rounded border-stone-300 text-[#16324f]" />
                                    <label htmlFor="whatsapp" className="text-xs font-medium text-slate-600 dark:text-slate-400">Available on WhatsApp</label>
                                </div>
                                <div>
                                    <input {...register("salaryExpectation")} placeholder="Salary expectation" className={inputClass} />
                                </div>
                                <div className="md:col-span-2">
                                    <select {...register("seniorityLevel")} className={inputClass}>
                                        <option value="" disabled>Select seniority level</option>
                                        {profile?.seniorityLevel && !["Intern", "Junior", "Mid-Level", "Senior", "Lead", "Executive"].includes(profile.seniorityLevel) && (
                                            <option value={profile.seniorityLevel}>{profile.seniorityLevel}</option>
                                        )}
                                        <option value="Intern">Intern</option>
                                        <option value="Junior">Junior</option>
                                        <option value="Mid-Level">Mid-Level</option>
                                        <option value="Senior">Senior</option>
                                        <option value="Lead">Lead</option>
                                        <option value="Executive">Executive</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <select {...register("employmentType")} className={inputClass}>
                                        <option value="" disabled>Select employment type</option>
                                        {profile?.employmentType && !["Full-time", "Part-time", "Contract", "Freelance", "Internship"].includes(profile.employmentType) && (
                                            <option value={profile.employmentType}>{profile.employmentType}</option>
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
                                <textarea {...register("bio")} rows={5} placeholder="Short professional summary" className={`${inputClass} resize-y`} />
                                {errors.bio && <p className="mt-1 text-xs text-red-600">{errors.bio.message}</p>}
                            </div>

                            <div className="flex items-center gap-3 border-t border-stone-200 pt-4 dark:border-slate-800">
                                <button type="submit" disabled={saving || !isDirty} className="inline-flex items-center gap-2 rounded-xl bg-[#16324f] px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                    {saving ? "Saving..." : "Save profile"}
                                </button>
                            </div>
                        </form>
                    </SectionCard>

                    <SectionCard title="Education">
                        <div className="space-y-4 p-6">
                            {educationFields.map((field, index) => (
                                <div key={field.id} className="rounded-2xl border border-stone-200 bg-stone-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                        <input {...register(`education.${index}.certificate`)} placeholder="Certificate" className={inputClass} />
                                        <input {...register(`education.${index}.institution`)} placeholder="Institution" className={inputClass} />
                                        <input {...register(`education.${index}.startDate`)} placeholder="Start date" className={inputClass} />
                                        <input {...register(`education.${index}.endDate`)} placeholder="End date" className={inputClass} />
                                    </div>
                                    <button type="button" onClick={() => educationRemove(index)} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-red-600 hover:underline">
                                        <Trash2 size={14} />
                                        Remove
                                    </button>
                                </div>
                            ))}
                            <button type="button" onClick={() => educationAppend({ certificate: "", institution: "", startDate: "", endDate: "" })} className="inline-flex items-center gap-2 text-sm font-semibold text-[#16324f] hover:underline dark:text-slate-200">
                                <Plus size={16} />
                                Add education
                            </button>
                        </div>
                    </SectionCard>

                    <SectionCard title="Experience">
                        <div className="space-y-4 p-6">
                            {fields.map((field, index) => (
                                <div key={field.id} className="rounded-2xl border border-stone-200 bg-stone-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                        <input {...register(`experience.${index}.role`)} placeholder="Role" className={inputClass} />
                                        <input {...register(`experience.${index}.company`)} placeholder="Company" className={inputClass} />
                                        <input {...register(`experience.${index}.startDate`)} placeholder="Start date" className={inputClass} />
                                        <input {...register(`experience.${index}.endDate`)} placeholder="End date" className={inputClass} />
                                        <div className="md:col-span-2">
                                            <textarea {...register(`experience.${index}.description`)} rows={3} placeholder="What you worked on" className={`${inputClass} resize-y`} />
                                        </div>
                                    </div>
                                    <button type="button" onClick={() => remove(index)} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-red-600 hover:underline">
                                        <Trash2 size={14} />
                                        Remove
                                    </button>
                                </div>
                            ))}
                            <button type="button" onClick={() => append({ role: "", company: "", startDate: "", description: "" })} className="inline-flex items-center gap-2 text-sm font-semibold text-[#16324f] hover:underline dark:text-slate-200">
                                <Plus size={16} />
                                Add experience
                            </button>
                        </div>
                    </SectionCard>
                </div>

                <div className="space-y-6">
                    <SectionCard title="Skills">
                        <div className="space-y-4 p-6">
                            <div className="flex flex-wrap gap-2">
                                {watchedSkills.length > 0 ? watchedSkills.map((skill) => (
                                    <Badge key={skill} variant="secondary" className="gap-2">
                                        {skill}
                                        <button type="button" onClick={() => setValue("skills", watchedSkills.filter((s) => s !== skill), { shouldDirty: true })}>
                                            <Trash2 size={12} />
                                        </button>
                                    </Badge>
                                )) : <p className="text-sm text-slate-500 dark:text-slate-400">No skills added yet.</p>}
                            </div>
                            <div className="flex gap-2">
                                <input value={newSkill} onChange={(e) => setNewSkill(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill(newSkill))} placeholder="Add a skill" className={inputClass} />
                                <button type="button" onClick={() => addSkill(newSkill)} className="rounded-xl bg-[#16324f] px-4 py-3 text-sm font-semibold text-white hover:opacity-90">
                                    Add
                                </button>
                            </div>
                        </div>
                    </SectionCard>

                    <SectionCard title="Quick status">
                        <div className="space-y-3 p-6 text-sm text-slate-600 dark:text-slate-400">
                            <p>Completion: <span className="font-semibold text-slate-900 dark:text-white">{profile.completion ?? 0}%</span></p>
                            <p>Skills: <span className="font-semibold text-slate-900 dark:text-white">{profile.skills?.length ?? 0} added</span></p>
                        </div>
                    </SectionCard>
                </div>
            </div>
        </div>
    );
}
