"use client";

import { useEffect, useState } from "react";
import { Upload, Eye, Trophy, ShieldCheck, AlertCircle, Trash2, User } from "lucide-react";
import { PageHeader, SectionCard, Badge } from "@/components/dashboard/ui";
import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Certificate } from "@/types";

const MAX_CERTS = 5;

const tips = [
    { title: "Upload verified credentials", desc: "Upload official certificates and degrees to verify your qualifications." },
    { title: "Clear PDFs only", desc: "Ensure your PDFs contain readable text so our AI can extract your qualification title automatically." },
    { title: "Match your legal name", desc: "Certs should ideally match your registered profile name for automatic verification status." },
];

function cn(...inputs: (string | boolean | undefined | null)[]) {
    return inputs.filter(Boolean).join(" ");
}

export default function CertificatesPage() {
    const [certificates, setCertificates] = useState<Certificate[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const router = useRouter();

    const fetchCertificates = async () => {
        try {
            const res = await apiFetch("/api/profile/certificate");
            const data = await res.json();
            setCertificates(Array.isArray(data) ? data : []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchCertificates(); }, []);

    const handleUpload = async (file: File) => {
        if (!file) return;
        if (certificates.length >= MAX_CERTS) {
            toast.error(`You can only upload up to ${MAX_CERTS} certificates.`);
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append("certificate", file);

        try {
            const res = await apiFetch("/api/profile/certificate", { method: "POST", body: formData });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Upload failed");

            const cert = data.certificate;
            if (cert.parsedQualification) {
                toast.success(cert.isNameVerified ? "Verified certificate added!" : "Certificate added (name unverified)");
            } else {
                toast.success("Certificate uploaded. No text could be automatically extracted.");
            }

            await fetchCertificates();
            router.refresh();
        } catch (error: any) {
            console.error("Upload error:", error);
            toast.error(error.message || "Failed to upload document.");
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Remove this certificate from your profile?")) return;
        setDeletingId(id);
        try {
            const res = await apiFetch(`/api/profile/certificate/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Delete failed");
            toast.success("Certificate removed");
            await fetchCertificates();
            router.refresh();
        } catch (error: any) {
            toast.error(error.message || "Failed to delete certificate");
        } finally {
            setDeletingId(null);
        }
    };

    if (loading) return <div className="p-12 text-center animate-pulse font-bold text-slate-400">Loading documents...</div>;

    const canUpload = certificates.length < MAX_CERTS;

    return (
        <div className="space-y-6 pb-20">
            <PageHeader
                title="Academic Qualifications"
                subtitle="Manage your verified certificates and degrees (Max 5)"
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* ── Certificates Gallery ───────────────────────────────────────── */}
                <div className="lg:col-span-2 space-y-6">
                    <SectionCard title={`Your Credentials (${certificates.length}/${MAX_CERTS})`}>
                        <div className="p-6 space-y-6">
                            {certificates.length === 0 ? (
                                <div className="h-40 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-center p-6 bg-slate-50/50">
                                    <Trophy size={32} className="text-slate-300 mb-2" />
                                    <p className="text-xs font-bold text-slate-400 uppercase">No Certificates Uploaded</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {certificates.map((cert) => (
                                        <div key={cert.id} className="relative p-5 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow group flex flex-col justify-between">
                                            <div className="space-y-3">
                                                <div className="flex items-start justify-between">
                                                    <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
                                                        <Trophy size={20} />
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <a href={cert.url} target="_blank" className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors">
                                                            <Eye size={16} />
                                                        </a>
                                                        <button
                                                            onClick={() => handleDelete(cert.id)}
                                                            disabled={deletingId === cert.id}
                                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        >
                                                            {deletingId === cert.id ? <AlertCircle size={16} className="animate-pulse" /> : <Trash2 size={16} />}
                                                        </button>
                                                    </div>
                                                </div>

                                                <div>
                                                    <p className="text-xs font-black text-slate-900 truncate" title={cert.fileName}>
                                                        {cert.fileName || "Certificate.pdf"}
                                                    </p>
                                                    {cert.parsedQualification ? (
                                                        <p className="text-[10px] font-bold text-slate-500 mt-1 line-clamp-2 leading-relaxed h-8">
                                                            {cert.parsedQualification}
                                                        </p>
                                                    ) : (
                                                        <p className="text-[10px] italic text-slate-400 mt-1 h-8 flex items-center">
                                                            Awaiting manual review (scan)
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                                                {cert.isNameVerified ? (
                                                    <div className="flex items-center gap-1.5 text-emerald-600">
                                                        <ShieldCheck size={14} />
                                                        <span className="text-[9px] font-black uppercase tracking-wider">Name Verified</span>
                                                    </div>
                                                ) : cert.parsedCertName ? (
                                                    <div className="flex items-center gap-1.5 text-amber-600" title={`Name on cert: ${cert.parsedCertName}`}>
                                                        <AlertCircle size={14} />
                                                        <span className="text-[9px] font-black uppercase tracking-wider">Name Mismatch</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1.5 text-slate-400">
                                                        <User size={14} />
                                                        <span className="text-[9px] font-black uppercase tracking-wider">Unverified</span>
                                                    </div>
                                                )}
                                                <span className="text-[9px] font-bold text-slate-400">
                                                    {new Date(cert.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="pt-4 border-t border-slate-100">
                                <div className="relative group">
                                    <input
                                        type="file"
                                        id="cert-upload"
                                        accept=".pdf"
                                        className="sr-only"
                                        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                                        disabled={uploading || !canUpload}
                                    />
                                    <label
                                        htmlFor="cert-upload"
                                        className={cn(
                                            "w-full h-14 rounded-2xl flex items-center justify-center gap-3 font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl",
                                            !canUpload
                                                ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none border border-slate-200"
                                                : uploading
                                                    ? "bg-purple-100 text-purple-400 cursor-not-allowed"
                                                    : "bg-slate-900 text-white hover:bg-purple-600 shadow-slate-900/20 cursor-pointer"
                                        )}
                                    >
                                        {!canUpload ? "Maximum Certificates Reached" : uploading ? "Verifying Certificate..." : "Upload Certificate"}
                                        {canUpload && !uploading && <Upload size={16} />}
                                    </label>
                                </div>
                            </div>
                        </div>
                    </SectionCard>
                </div>

                {/* ── Tips Sidebar ─────────────────────────────────────────────── */}
                <div className="lg:col-span-1 space-y-6">
                    <SectionCard title="Verification Best Practices">
                        <div className="divide-y divide-slate-100">
                            {tips.map((tip, i) => (
                                <div key={i} className="px-6 py-4 flex items-start gap-4 hover:bg-slate-50 transition-colors">
                                    <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 text-[10px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                                        {i + 1}
                                    </span>
                                    <div>
                                        <p className="text-xs font-bold text-slate-800">{tip.title}</p>
                                        <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{tip.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </SectionCard>

                    <SectionCard title="AI Matching Engine">
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                                    <ShieldCheck size={20} />
                                </div>
                                <h4 className="text-sm font-black text-slate-900">How it works</h4>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed font-medium">
                                Elite employers value verified credentials. Our AI scans your certificates for qualification levels (Degrees, Masters, etc.) and cross-references the name against your profile.
                                <br /><br />
                                <span className="text-blue-600 font-bold">Verified degrees boost your AI Match Score by up to 15% for relevant roles.</span>
                            </p>
                        </div>
                    </SectionCard>
                </div>
            </div>
        </div>
    );
}
