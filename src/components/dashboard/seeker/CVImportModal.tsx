"use client";

import { useState } from "react";
import { FileText, Sparkles, Check, AlertCircle, Loader2, X } from "lucide-react";
import { toast } from "sonner";

interface ParsedCVData {
    full_name: string;
    phone: string;
    bio: string;
    qualification: string;
    skills: string[];
    experience: Array<{ title: string; company: string; period: string; description: string }>;
    education: Array<{ degree: string; institution: string; year: string }>;
}

interface CVImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApplyToProfile: (extractedData: Partial<ParsedCVData>) => void;
}

export default function CVImportModal({ isOpen, onClose, onApplyToProfile }: CVImportModalProps) {
    const [rawText, setRawText] = useState("");
    const [parsing, setParsing] = useState(false);
    const [parsedData, setParsedData] = useState<ParsedCVData | null>(null);

    if (!isOpen) return null;

    const handleParse = async () => {
        if (!rawText.trim()) {
            toast.error("Please paste your CV text to import.");
            return;
        }

        setParsing(true);
        try {
            const res = await fetch("/api/seeker/cv-parse", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: rawText }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to parse CV");
            }

            setParsedData(data.data);
            toast.success("CV parsed successfully! Review extracted fields below.");
        } catch (err: any) {
            toast.error(err.message || "Failed to parse CV");
        } finally {
            setParsing(false);
        }
    };

    const handleApply = () => {
        if (!parsedData) return;
        onApplyToProfile(parsedData);
        toast.success("Parsed data applied to profile!");
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in">
            <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50/50 px-6 py-4 dark:border-slate-800 dark:bg-slate-800/40">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                            <Sparkles className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-white">Import from CV / Resume</h2>
                            <p className="text-xs text-slate-500">Paste your resume text to automatically fill profile fields.</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1.5 text-slate-400 hover:bg-stone-200 dark:hover:bg-slate-800"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="max-h-[75vh] overflow-y-auto p-6 space-y-6">
                    {!parsedData ? (
                        <div className="space-y-4">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                                Paste Resume Content
                            </label>
                            <textarea
                                value={rawText}
                                onChange={(e) => setRawText(e.target.value)}
                                rows={10}
                                placeholder="Paste the text from your Word document, PDF, or text file here..."
                                className="w-full rounded-2xl border border-stone-200 bg-stone-50/50 p-4 text-xs font-mono text-slate-800 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                            />
                            <button
                                onClick={handleParse}
                                disabled={parsing || !rawText.trim()}
                                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 py-3 text-xs font-bold text-slate-950 transition hover:bg-amber-400 disabled:opacity-50"
                            >
                                {parsing ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" /> Parsing CV...
                                    </>
                                ) : (
                                    <>
                                        <FileText className="h-4 w-4" /> Extract Profile Data
                                    </>
                                )}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300">
                                <span className="flex items-center gap-2 font-medium">
                                    <Check size={16} className="text-emerald-600" /> Review Extracted Data Below
                                </span>
                                <button
                                    onClick={() => setParsedData(null)}
                                    className="text-[11px] font-bold text-emerald-700 underline dark:text-emerald-300"
                                >
                                    Re-paste Text
                                </button>
                            </div>

                            <div className="grid gap-3 text-xs sm:grid-cols-2">
                                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                                    <span className="font-bold text-slate-500">Name</span>
                                    <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                                        {parsedData.full_name || "(Not found)"}
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                                    <span className="font-bold text-slate-500">Phone</span>
                                    <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                                        {parsedData.phone || "(Not found)"}
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3 dark:border-slate-800 dark:bg-slate-800/40 sm:col-span-2">
                                    <span className="font-bold text-slate-500">Qualification</span>
                                    <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                                        {parsedData.qualification || "(Not detected)"}
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3 dark:border-slate-800 dark:bg-slate-800/40 sm:col-span-2">
                                    <span className="font-bold text-slate-500">Extracted Skills ({parsedData.skills.length})</span>
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                        {parsedData.skills.length > 0 ? (
                                            parsedData.skills.map((skill, i) => (
                                                <span key={i} className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                                    {skill}
                                                </span>
                                            ))
                                        ) : (
                                            <p className="text-slate-400">No matching skills detected automatically.</p>
                                        )}
                                    </div>
                                </div>
                                {parsedData.bio && (
                                    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3 dark:border-slate-800 dark:bg-slate-800/40 sm:col-span-2">
                                        <span className="font-bold text-slate-500">Professional Summary</span>
                                        <p className="mt-1 text-slate-700 dark:text-slate-300 leading-relaxed">
                                            {parsedData.bio}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setParsedData(null)}
                                    className="w-1/2 rounded-2xl border border-stone-200 py-3 text-xs font-bold text-slate-700 hover:bg-stone-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                                >
                                    Cancel & Try Again
                                </button>
                                <button
                                    onClick={handleApply}
                                    className="w-1/2 rounded-2xl bg-emerald-500 py-3 text-xs font-bold text-slate-950 transition hover:bg-emerald-400"
                                >
                                    Apply to My Profile
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
