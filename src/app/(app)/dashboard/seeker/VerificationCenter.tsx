"use client";

import { useState } from "react";
import { Shield, Upload, CheckCircle2, AlertCircle, Loader2, FileText } from "lucide-react";
import { uploadAndVerifyCertificate } from "./actions";
import { cn } from "@/lib/utils";

interface VerificationCenterProps {
    topVerificationTier: number;
    fullName: string;
}

const TIERS = [
    "Certificate",
    "Diploma",
    "Bachelors",
    "Masters / Honours",
    "Doctorate"
];

export function VerificationCenter({ topVerificationTier, fullName }: VerificationCenterProps) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setUploading(true);
        setError(null);
        setSuccess(false);

        const formData = new FormData(e.currentTarget);
        const res = await uploadAndVerifyCertificate(formData);

        setUploading(false);
        if (res.error) {
            setError(res.error);
        } else if (res.success) {
            setSuccess(true);
            setTimeout(() => window.location.reload(), 2000);
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Shield className="text-blue-600" size={18} />
                    <h3 className="text-sm font-bold text-slate-800">Verification Center</h3>
                </div>
                {topVerificationTier >= 0 && (
                    <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-100 flex items-center gap-1">
                        <CheckCircle2 size={12} /> Verified: {TIERS[topVerificationTier]}
                    </span>
                )}
            </div>

            <div className="p-6 space-y-4">
                {topVerificationTier < 0 ? (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 text-blue-800">
                        <AlertCircle className="flex-shrink-0" size={18} />
                        <div className="text-xs">
                            <p className="font-bold">Not Verified Yet</p>
                            <p className="mt-1 opacity-80">Upload your highest academic certificate to earn the "Verified" badge and increase your visibility to employers by up to 3x.</p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex gap-3 text-green-800">
                        <CheckCircle2 className="flex-shrink-0" size={18} />
                        <div className="text-xs">
                            <p className="font-bold">Trust Badge Active</p>
                            <p className="mt-1 opacity-80">Your {TIERS[topVerificationTier]} has been verified against your name: <strong>{fullName}</strong>.</p>
                        </div>
                    </div>
                )}

                <form onSubmit={handleUpload} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Qualification Title</label>
                            <input
                                name="title"
                                placeholder="e.g. BSc in Computer Science"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                                required
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Issuer / Institution</label>
                            <input
                                name="issuer"
                                placeholder="e.g. MUBAS"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                                required
                            />
                        </div>
                    </div>

                    <div className="relative group">
                        <input
                            type="file"
                            name="certificate"
                            accept=".pdf"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            required
                        />
                        <div className="border-2 border-dashed border-slate-200 group-hover:border-blue-400 group-hover:bg-blue-50 transition-all rounded-2xl p-6 flex flex-col items-center gap-2 text-center">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:text-blue-500 group-hover:bg-blue-100 transition-colors">
                                <Upload size={20} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-700">Upload PDF Certificate</p>
                                <p className="text-[10px] text-slate-400 mt-1 font-medium">Only PDF files are supported for AI verification.</p>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-100 px-4 py-2 rounded-xl text-xs font-bold">
                            <AlertCircle size={14} /> {error}
                        </div>
                    )}

                    {success && (
                        <div className="flex items-center gap-2 text-green-600 bg-green-50 border border-green-100 px-4 py-2 rounded-xl text-xs font-bold">
                            <CheckCircle2 size={14} /> Verification successful! Refreshing...
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={uploading}
                        className={cn(
                            "w-full py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 shadow-sm",
                            uploading ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-slate-900 shadow-blue-200/50"
                        )}
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="animate-spin" size={18} />
                                Running AI OCR...
                            </>
                        ) : (
                            "Verify Certificate"
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
