"use client";

import { useState } from "react";
import { apiFetchJson } from "@/lib/api";

interface CreateJobModalProps {
    onClose: () => void;
    onCreated: () => void;
}

import { motion, AnimatePresence } from "framer-motion";
import { X, Briefcase, MapPin, Target, DollarSign, Sparkles, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CreateJobModalProps {
    onClose: () => void;
    onCreated: () => void;
}

export default function CreateJobModal({ onClose, onCreated }: CreateJobModalProps) {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        location: "",
        type: "full-time",
        skills: "",
        salaryRange: "",
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (step < 2) {
            setStep(2);
            return;
        }
        setLoading(true);
        try {
            const res = await apiFetchJson("/jobs", {
                method: "POST",
                body: JSON.stringify({
                    ...formData,
                    skills: formData.skills.split(",").map((s) => s.trim()).filter(Boolean),
                }),
            });
            if (res.ok) {
                onCreated();
                onClose();
            }
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "w-full px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-slate-900 dark:text-white placeholder:text-slate-400";

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white dark:bg-slate-950 rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] border border-white/20 dark:border-slate-800"
            >
                <div className="px-10 py-8 border-b border-slate-100 dark:border-slate-900 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
                            <Briefcase size={24} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Deploy Opportunity</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <div className={cn("h-1.5 w-12 rounded-full transition-all", step >= 1 ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-800")} />
                                <div className={cn("h-1.5 w-12 rounded-full transition-all", step >= 2 ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-800")} />
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-12 h-12 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm border border-slate-100 dark:border-slate-700">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-10 space-y-8">
                    <AnimatePresence mode="wait">
                        {step === 1 ? (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-8"
                            >
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Campaign Title</label>
                                    <input
                                        type="text" required placeholder="e.g. Senior Principal Architect"
                                        className={inputClass} value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Strategic Narrative</label>
                                    <textarea
                                        required rows={4} placeholder="Describe the mission and impact of this role..."
                                        className={cn(inputClass, "resize-none p-6")} value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Deployment Base</label>
                                        <div className="relative group">
                                            <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                                            <input
                                                type="text" required placeholder="Remote, New York, etc."
                                                className={cn(inputClass, "pl-14")} value={formData.location}
                                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Contract Protocol</label>
                                        <select
                                            className={inputClass} value={formData.type}
                                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        >
                                            <option value="full-time">Full-time</option>
                                            <option value="part-time">Part-time</option>
                                            <option value="contract">Contract</option>
                                            <option value="internship">Internship</option>
                                        </select>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-8"
                            >
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Required Competencies</label>
                                    <div className="relative group">
                                        <Target className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                                        <input
                                            type="text" placeholder="React, Go, System Design (comma separated)"
                                            className={cn(inputClass, "pl-14")} value={formData.skills}
                                            onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Compensation Pulse</label>
                                    <div className="relative group">
                                        <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                                        <input
                                            type="text" placeholder="e.g. $140k - $180k"
                                            className={cn(inputClass, "pl-14")} value={formData.salaryRange}
                                            onChange={(e) => setFormData({ ...formData, salaryRange: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="p-8 bg-blue-600/5 rounded-3xl border border-blue-500/10 space-y-4">
                                    <h4 className="flex items-center gap-2 text-sm font-black text-blue-600 uppercase tracking-widest">
                                        <Sparkles size={16} /> Recruiting Intelligence
                                    </h4>
                                    <p className="text-xs font-medium text-slate-500 leading-relaxed">
                                        Roles with clear compensation and structured competency requirements receive <strong>3x higher quality</strong> applications in the first 24 hours.
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="flex gap-4 pt-4">
                        {step > 1 && (
                            <button
                                type="button" onClick={() => setStep(1)}
                                className="flex-1 h-14 rounded-2xl bg-slate-100 dark:bg-slate-900/50 text-slate-500 font-bold uppercase tracking-widest text-[10px] hover:bg-slate-200 dark:hover:bg-slate-800 transition-all border border-slate-200 dark:border-slate-800"
                            >
                                Back
                            </button>
                        )}
                        <button
                            type="submit" disabled={loading}
                            className="flex-[2] h-14 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-500 transition-all shadow-xl shadow-blue-500/20 active:scale-95 disabled:opacity-50 uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <span className="animate-pulse">Broadcasting...</span>
                            ) : (
                                <>
                                    <Wand2 size={16} className={cn(step === 2 && "animate-sparkle")} />
                                    {step === 1 ? "Next Phase" : "Initialize Broadcasting"}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
