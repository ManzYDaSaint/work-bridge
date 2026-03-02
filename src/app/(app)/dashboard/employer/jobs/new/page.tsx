"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { jobSchema, JobValues } from "@/lib/validations/job";
import { apiFetchJson } from "@/lib/api";
import { Briefcase, MapPin, Clock, DollarSign, Plus, X, Loader2, Sparkles } from "lucide-react";
import { PageHeader, SectionCard } from "@/components/dashboard/ui";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

export default function NewJobPage() {
    const [saving, setSaving] = useState(false);
    const [newSkill, setNewSkill] = useState("");
    const router = useRouter();

    const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<JobValues>({
        resolver: zodResolver(jobSchema),
        defaultValues: {
            skills: [],
            type: "FULL_TIME",
        }
    });

    const watchedSkills = watch("skills") || [];

    const addSkill = (skill: string) => {
        const trimmed = skill.trim();
        if (!trimmed) return;
        if (!watchedSkills.includes(trimmed)) {
            setValue("skills", [...watchedSkills, trimmed], { shouldDirty: true });
        }
        setNewSkill("");
    };

    const removeSkill = (skillToRemove: string) => {
        setValue("skills", watchedSkills.filter(s => s !== skillToRemove), { shouldDirty: true });
    };

    const onSubmit = async (data: JobValues) => {
        setSaving(true);
        try {
            const res = await apiFetchJson("/api/jobs", {
                method: "POST",
                body: JSON.stringify(data),
            });
            if (res.ok) {
                router.push("/dashboard/employer/jobs");
                router.refresh();
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
            <PageHeader
                title="Create Opportunity"
                subtitle="Design a compelling job listing to attract elite talent"
                action={{ label: "Back to Jobs", href: "/dashboard/employer/jobs", variant: "secondary" }}
            />

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <SectionCard title="Job Core Identity">
                    <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-8">
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Job Title</label>
                                <input
                                    {...register("title")}
                                    placeholder="e.g. Senior Frontend Architect"
                                    className="w-full h-16 px-8 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all text-lg"
                                />
                                {errors.title && <p className="text-red-500 text-[10px] font-bold ml-4 mt-1">{errors.title.message}</p>}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 flex items-center gap-2">
                                        <MapPin size={14} className="text-blue-500" /> Location
                                    </label>
                                    <input
                                        {...register("location")}
                                        placeholder="Remote or City, Country"
                                        className="w-full h-14 px-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all"
                                    />
                                    {errors.location && <p className="text-red-500 text-[10px] font-bold ml-4 mt-1">{errors.location.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 flex items-center gap-2">
                                        <Clock size={14} className="text-indigo-500" /> Employment Type
                                    </label>
                                    <select
                                        {...register("type")}
                                        className="w-full h-14 px-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all appearance-none"
                                    >
                                        <option value="FULL_TIME">Full-time</option>
                                        <option value="PART_TIME">Part-time</option>
                                        <option value="CONTRACT">Contract</option>
                                        <option value="FREELANCE">Freelance</option>
                                        <option value="INTERNSHIP">Internship</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Required Competencies</label>
                                <div className="flex flex-wrap gap-2 px-4 mb-4">
                                    <AnimatePresence>
                                        {watchedSkills.map((skill, i) => (
                                            <motion.span
                                                initial={{ scale: 0.8, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                exit={{ scale: 0.8, opacity: 0 }}
                                                key={i}
                                                className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-[10px] font-black uppercase tracking-widest rounded-xl border border-blue-100 dark:border-blue-800 flex items-center gap-2 group hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-colors"
                                            >
                                                {skill}
                                                <button type="button" onClick={() => removeSkill(skill)} className="transition-colors">
                                                    <X size={14} />
                                                </button>
                                            </motion.span>
                                        ))}
                                    </AnimatePresence>
                                    {watchedSkills.length === 0 && (
                                        <p className="text-[10px] text-slate-400 font-bold italic ml-2">No skills specified yet...</p>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        value={newSkill}
                                        onChange={(e) => setNewSkill(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill(newSkill))}
                                        placeholder="Add required skill (e.g. Next.js, Cloud Architecture)"
                                        className="flex-1 h-14 px-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all shadow-inner"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => addSkill(newSkill)}
                                        className="h-14 px-8 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 dark:hover:bg-blue-500 transition-all flex items-center gap-2"
                                    >
                                        <Plus size={16} /> Add
                                    </button>
                                </div>
                                {errors.skills && <p className="text-red-500 text-[10px] font-bold ml-4 mt-1">{errors.skills.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 flex items-center gap-2">
                                    <Sparkles size={14} className="text-purple-500" /> Operational Narrative (Description)
                                </label>
                                <textarea
                                    {...register("description")}
                                    rows={8}
                                    placeholder="Describe the role, responsibilities, and impact expected..."
                                    className="w-full p-8 rounded-[2.5rem] bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all resize-none shadow-inner"
                                />
                                {errors.description && <p className="text-red-500 text-[10px] font-bold ml-4 mt-1">{errors.description.message}</p>}
                            </div>

                            <div className="flex items-center gap-4 pt-6 border-t border-slate-100 dark:border-slate-800/50">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="h-16 px-12 bg-blue-600 text-white text-xs font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-blue-700 transition-all shadow-2xl shadow-blue-500/20 disabled:opacity-50 active:scale-95 flex items-center gap-3"
                                >
                                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Briefcase size={20} />}
                                    {saving ? "Deploying listing..." : "Launch Job Posting"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => router.back()}
                                    className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all ml-4"
                                >
                                    Abort Mission
                                </button>
                            </div>
                        </div>
                    </form>
                </SectionCard>
            </motion.div>
        </div>
    );
}
