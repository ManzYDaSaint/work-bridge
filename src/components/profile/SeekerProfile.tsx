"use client";

import { useEffect, useState } from "react";
import { apiFetch, apiFetchJson } from "@/lib/api";
import { JobSeeker } from "@/types";
import { FileText, MapPin, CheckCircle, Upload, Save, Sparkles, User as UserIcon, ExternalLink, Edit3, Briefcase, Clock, X, Plus, Trash, Camera, ShieldCheck, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { seekerProfileSchema, type SeekerProfileValues } from "@/lib/validations/profile";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useFieldArray } from "react-hook-form";

interface SeekerProfileData extends JobSeeker {
    completion: number;
}

export default function SeekerProfile() {
    const [profile, setProfile] = useState<SeekerProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [newSkill, setNewSkill] = useState("");
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [hasBadge, setHasBadge] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const router = useRouter();

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        control,
        formState: { errors, isSubmitting },
    } = useForm<SeekerProfileValues>({
        resolver: zodResolver(seekerProfileSchema),
        defaultValues: {
            fullName: "",
            bio: "",
            location: "",
            skills: [],
            experience: [],
            salaryExpectation: "",
            seniorityLevel: "",
            employmentType: "",
        },
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "experience",
    });

    const watchedSkills = watch("skills") || [];

    const fetchProfile = async () => {
        try {
            const res = await apiFetch("/api/profile");
            const data: SeekerProfileData = await res.json();
            setProfile(data);
            setAvatarUrl((data as any).avatarUrl ?? null);
            setHasBadge((data as any).hasBadge ?? false);
            reset({
                fullName: data.fullName ?? "",
                bio: data.bio ?? "",
                location: data.location ?? "",
                skills: data.skills ?? [],
                experience: (data as any).experience ?? [],
                salaryExpectation: data.salaryExpectation ?? "",
                seniorityLevel: data.seniorityLevel ?? "",
                employmentType: data.employmentType ?? "",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchProfile(); }, []);

    const addSkill = (skill: string) => {
        const trimmed = skill.trim();
        if (!trimmed) return;
        const currentSkills = watchedSkills;
        if (!currentSkills.includes(trimmed)) {
            setValue("skills", [...currentSkills, trimmed], { shouldDirty: true });
        }
        setNewSkill("");
    };

    const removeSkill = (skillToRemove: string) => {
        const currentSkills = watchedSkills;
        setValue("skills", currentSkills.filter(s => s !== skillToRemove), { shouldDirty: true });
    };

    const onSubmit = async (data: SeekerProfileValues) => {
        setSaving(true);
        try {
            await apiFetchJson("/api/profile", {
                method: "PUT",
                body: JSON.stringify(data),
            });
            await fetchProfile();
            router.refresh();
            setEditing(false);
        } finally {
            setSaving(false);
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingAvatar(true);
        try {
            const formData = new FormData();
            formData.append("avatar", file);
            const res = await apiFetch("/api/profile/avatar", {
                method: "POST",
                body: formData,
            });
            const json = await res.json();
            if (json.url) {
                setAvatarUrl(json.url);
            }
        } catch (err) {
            console.error("Avatar upload failed", err);
        } finally {
            setUploadingAvatar(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <motion.div
                animate={{ rotate: 360, scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full shadow-2xl shadow-blue-500/20"
            />
        </div>
    );

    if (!profile) return null;

    const completionScore = profile.completion ?? 0;

    return (
        <div className="max-w-6xl mx-auto space-y-12 pb-24">
            {/* Header Hero */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-effect p-10 md:p-14 rounded-[3.5rem] border border-slate-200 dark:border-slate-800/50 shadow-2xl relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 blur-[120px] -z-10" />
                <div className="flex flex-col md:flex-row items-center gap-10 md:gap-14">
                    {/* Avatar with upload button */}
                    <div className="relative group">
                        {avatarUrl ? (
                            <img
                                src={avatarUrl}
                                alt={profile.fullName ?? "Profile"}
                                className="w-40 h-40 md:w-48 md:h-48 rounded-[3rem] object-cover shadow-2xl shadow-blue-500/30 group-hover:scale-105 transition-transform duration-500"
                            />
                        ) : (
                            <div className="w-40 h-40 md:w-48 md:h-48 rounded-[3rem] bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-6xl font-black shadow-2xl shadow-blue-500/30 group-hover:scale-105 transition-transform duration-500">
                                {profile.fullName?.[0] ?? "?"}
                            </div>
                        )}
                        {/* Upload button overlay */}
                        <label
                            htmlFor="avatar-input"
                            className="absolute inset-0 flex items-center justify-center rounded-[3rem] bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                            {uploadingAvatar ? (
                                <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Camera size={32} className="text-white drop-shadow-lg" />
                            )}
                        </label>
                        <input
                            id="avatar-input"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleAvatarUpload}
                        />
                        <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-green-500 shadow-xl border border-slate-100 dark:border-slate-700">
                            <CheckCircle size={32} />
                        </div>
                    </div>
                    <div className="flex-1 text-center md:text-left space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                            <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                                {profile.fullName || "Mysterious Professional"}
                            </h2>
                            <button
                                onClick={() => hasBadge && setEditing(!editing)}
                                title={hasBadge ? "Edit profile" : "Get the WorkBridge Badge to edit your profile"}
                                className={`w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center transition-colors shadow-sm self-center md:self-auto ${hasBadge
                                        ? "text-slate-400 hover:text-blue-600"
                                        : "text-slate-200 cursor-not-allowed opacity-50"
                                    }`}
                            >
                                <Edit3 size={20} />
                            </button>
                        </div>
                        <p className="text-xl text-slate-500 dark:text-slate-400 font-medium max-w-2xl leading-relaxed">
                            {profile.bio || "Architecting the future, one step at a time. Define your professional narrative to connect with elite opportunities."}
                        </p>
                        <div className="flex flex-wrap justify-center md:justify-start gap-6 pt-2">
                            <div className="flex items-center gap-2 text-sm font-black text-slate-400 uppercase tracking-widest">
                                <MapPin size={18} className="text-blue-500" />
                                {profile.location || "Location Private"}
                            </div>
                            <div className="flex items-center gap-2 text-sm font-black text-slate-400 uppercase tracking-widest">
                                <Briefcase size={18} className="text-indigo-500" />
                                Open for Opportunities
                            </div>
                        </div>
                    </div>
                    {/* Completion Score */}
                    <div className="hidden lg:flex flex-col items-center gap-3">
                        <div className="w-28 h-28 relative">
                            <svg className="w-full h-full -rotate-90">
                                <circle cx="56" cy="56" r="48" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-100 dark:text-slate-800" />
                                <motion.circle
                                    cx="56" cy="56" r="48" fill="none" stroke="currentColor" strokeWidth="8"
                                    strokeDasharray={301.6}
                                    initial={{ strokeDashoffset: 301.6 }}
                                    animate={{ strokeDashoffset: 301.6 - (301.6 * completionScore) / 100 }}
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                    className="text-blue-600 drop-shadow-[0_0_8px_rgba(37,99,235,0.4)]"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-xl font-black text-slate-900 dark:text-white leading-none">{completionScore}%</span>
                            </div>
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Profile Pulse</span>
                    </div>
                </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Side Panels */}
                <div className="space-y-12">
                    {/* Documents Summary */}
                    <motion.div
                        whileHover={{ y: -5 }}
                        className="glass-effect p-8 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-xl"
                    >
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8">Professional Dossier</h3>
                        <div className="space-y-4 mb-8">
                            <div className="flex items-center px-4 py-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50 justify-center">
                                <div className="text-center">
                                    <FileText size={24} className="text-blue-500 mx-auto mb-2" />
                                    <span className="text-xs font-bold text-slate-900 dark:text-white uppercase block">Certificates & Degrees</span>
                                    <span className="text-[10px] text-slate-500">Manage academic records</span>
                                </div>
                            </div>
                        </div>
                        <Link href="/dashboard/seeker/resume" className="w-full h-14 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 dark:hover:bg-blue-500 transition-all shadow-xl">
                            <Edit3 size={16} /> Manage Credentials
                        </Link>
                    </motion.div>

                    {/* Skills Matrix */}
                    <motion.div
                        whileHover={{ y: -5 }}
                        className="glass-effect p-8 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-xl"
                    >
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Competency Stack</h3>
                        </div>
                        <div className="flex flex-wrap gap-2.5">
                            {profile.skills && profile.skills.length > 0 ? (
                                profile.skills.map((skill: string, i: number) => (
                                    <span key={i} className="px-5 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-200 text-[10px] font-black uppercase tracking-widest rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm hover:border-blue-500/30 transition-colors">
                                        {skill}
                                    </span>
                                ))
                            ) : (
                                <p className="text-sm font-medium text-slate-400 italic">No competencies identified...</p>
                            )}
                        </div>
                    </motion.div>
                </div>

                {/* Main Content Area */}
                <div className="lg:col-span-2 space-y-12">
                    {/* Badge Gate */}
                    {!hasBadge && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="glass-effect p-8 rounded-[2.5rem] border border-amber-300/40 shadow-xl bg-amber-50/10 text-center space-y-4"
                        >
                            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mx-auto">
                                <Lock size={28} className="text-amber-600 dark:text-amber-400" />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                                Profile Editing Locked
                            </h3>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                                Get the <span className="text-blue-600 font-bold">WorkBridge Badge</span> to unlock profile editing, resume visibility, and employer discovery.
                            </p>
                            <a
                                href="/dashboard/seeker"
                                className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95"
                            >
                                <ShieldCheck size={16} /> Get My Badge
                            </a>
                        </motion.div>
                    )}

                    {editing && hasBadge ? (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="glass-effect p-10 rounded-[3rem] border border-blue-500/30 shadow-2xl space-y-8"
                        >
                            <div className="flex justify-between items-center">
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Professional Editor</h3>
                                <div className="flex gap-4">
                                    <button type="button" onClick={() => setEditing(false)} className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Cancel</button>
                                    <button type="button" onClick={handleSubmit(onSubmit)} disabled={saving || isSubmitting} className="px-8 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 disabled:opacity-50 transition-all">
                                        {saving || isSubmitting ? "Synthesizing..." : "Finalize Changes"}
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Full Identity</label>
                                        <input
                                            {...register("fullName")}
                                            className="w-full h-16 px-8 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                                        />
                                        {errors.fullName && <p className="text-red-500 text-[10px] font-bold ml-4 mt-1">{errors.fullName.message}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Location</label>
                                        <input
                                            {...register("location")}
                                            className="w-full h-16 px-8 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                                        />
                                        {errors.location && <p className="text-red-500 text-[10px] font-bold ml-4 mt-1">{errors.location.message}</p>}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Salary Expectation</label>
                                        <input
                                            {...register("salaryExpectation")}
                                            placeholder="e.g. MK 80k - MK 100k"
                                            className="w-full h-16 px-8 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Seniority Level</label>
                                        <select
                                            {...register("seniorityLevel")}
                                            className="w-full h-16 px-8 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none"
                                        >
                                            <option value="">Select Level</option>
                                            <option value="Junior">Junior</option>
                                            <option value="Mid-Level">Mid-Level</option>
                                            <option value="Senior">Senior</option>
                                            <option value="Lead">Lead</option>
                                            <option value="Architect">Architect</option>
                                            <option value="Executive">Executive</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Employment Type</label>
                                        <select
                                            {...register("employmentType")}
                                            className="w-full h-16 px-8 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none"
                                        >
                                            <option value="">Select Type</option>
                                            <option value="Full-time">Full-time</option>
                                            <option value="Part-time">Part-time</option>
                                            <option value="Contract">Contract</option>
                                            <option value="Freelance">Freelance</option>
                                            <option value="Internship">Internship</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Skills & Expertise</label>
                                    <div className="flex flex-wrap gap-2 px-4">
                                        {watchedSkills.map((skill, i) => (
                                            <span key={i} className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-[10px] font-black uppercase tracking-widest rounded-xl border border-blue-100 dark:border-blue-800 flex items-center gap-2 group">
                                                {skill}
                                                <button type="button" onClick={() => removeSkill(skill)} className="hover:text-red-500 transition-colors">
                                                    <X size={14} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            value={newSkill}
                                            onChange={(e) => setNewSkill(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill(newSkill))}
                                            placeholder="Add skill (e.g. React, UX Design)"
                                            className="flex-1 h-16 px-8 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => addSkill(newSkill)}
                                            className="h-16 px-8 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all"
                                        >
                                            Add
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Professional Narrative</label>
                                    <textarea
                                        rows={5}
                                        {...register("bio")}
                                        className="w-full p-8 rounded-[2rem] bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all resize-none"
                                    />
                                    {errors.bio && <p className="text-red-500 text-[10px] font-bold ml-4 mt-1">{errors.bio.message}</p>}
                                </div>

                                <div className="space-y-6">
                                    <div className="flex justify-between items-center ml-4">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Career Chronology</label>
                                        <button
                                            type="button"
                                            onClick={() => append({ role: "", company: "", startDate: "", description: "" })}
                                            className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-colors"
                                        >
                                            <Plus size={14} /> Add Experience
                                        </button>
                                    </div>

                                    <div className="space-y-8">
                                        {fields.map((field, index) => (
                                            <div key={field.id} className="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-slate-200 dark:border-slate-700 relative group">
                                                <button
                                                    type="button"
                                                    onClick={() => remove(index)}
                                                    className="absolute top-6 right-6 p-2 text-slate-300 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash size={18} />
                                                </button>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="space-y-2">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Job Role</label>
                                                        <input
                                                            {...register(`experience.${index}.role`)}
                                                            placeholder="Senior Developer"
                                                            className="w-full h-14 px-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all"
                                                        />
                                                        {errors.experience?.[index]?.role && <p className="text-red-500 text-[10px] font-bold ml-2">{errors.experience[index].role?.message}</p>}
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Organization</label>
                                                        <input
                                                            {...register(`experience.${index}.company`)}
                                                            placeholder="Tech Solutions Inc."
                                                            className="w-full h-14 px-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all"
                                                        />
                                                        {errors.experience?.[index]?.company && <p className="text-red-500 text-[10px] font-bold ml-2">{errors.experience[index].company?.message}</p>}
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Start Date</label>
                                                        <input
                                                            {...register(`experience.${index}.startDate`)}
                                                            placeholder="Jan 2022"
                                                            className="w-full h-14 px-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all"
                                                        />
                                                        {errors.experience?.[index]?.startDate && <p className="text-red-500 text-[10px] font-bold ml-2">{errors.experience[index].startDate?.message}</p>}
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">End Date</label>
                                                        <input
                                                            {...register(`experience.${index}.endDate`)}
                                                            placeholder="Present or Dec 2023"
                                                            className="w-full h-14 px-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all"
                                                        />
                                                    </div>
                                                    <div className="md:col-span-2 space-y-2">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Legacy Narrative</label>
                                                        <textarea
                                                            {...register(`experience.${index}.description`)}
                                                            rows={3}
                                                            placeholder="Key accomplishments and impact..."
                                                            className="w-full p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all resize-none"
                                                        />
                                                        {errors.experience?.[index]?.description && <p className="text-red-500 text-[10px] font-bold ml-2">{errors.experience[index].description?.message}</p>}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <div className="space-y-12">
                            {/* Experience Timeline — visible to all (badge needed to EDIT) */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="glass-effect p-10 rounded-[3.5rem] border border-slate-200 dark:border-slate-800 shadow-xl"
                            >
                                <div className="flex justify-between items-center mb-12">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Career Chronology</h3>
                                    <button onClick={() => setEditing(true)} className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] hover:underline">Update Timeline</button>
                                </div>

                                {profile.experience && profile.experience.length > 0 ? (
                                    <div className="space-y-12 relative">
                                        <div className="absolute left-8 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-800" />
                                        {profile.experience.map((exp, i) => (
                                            <div key={i} className="relative pl-24 group">
                                                <div className="absolute left-[30px] top-2 w-4 h-4 rounded-full bg-blue-600 border-4 border-white dark:border-slate-900 shadow-lg group-hover:scale-150 transition-transform" />
                                                <div className="space-y-2">
                                                    <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                                                        <h4 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{exp.role}</h4>
                                                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-500/10 px-3 py-1 rounded-lg border border-blue-500/20">{exp.company}</span>
                                                    </div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                        <Clock size={14} />
                                                        {exp.startDate} — {exp.endDate || "Present"}
                                                    </p>
                                                    <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed max-w-xl">
                                                        {exp.description}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-20 px-10 bg-slate-50 dark:bg-slate-800/30 rounded-[2.5rem] border-2 border-dashed border-slate-100 dark:border-slate-800">
                                        <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6 text-slate-200">
                                            <Sparkles size={32} />
                                        </div>
                                        <h4 className="text-lg font-black text-slate-900 dark:text-white mb-2">Blank Chronology</h4>
                                        <p className="text-sm font-medium text-slate-400 max-w-xs mx-auto">Your career story starts here. Document your professional journey.</p>
                                    </div>
                                )}
                            </motion.div>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}
