"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { CheckCircle, XCircle, Search, Loader2, ExternalLink, Award } from "lucide-react";
import { PageHeader } from "@/components/dashboard/ui";
import { toast } from "sonner";

export default function CertificateVerificationClient({ 
    initialCertificates 
}: { 
    initialCertificates: any[] 
}) {
    const [certificates, setCertificates] = useState(initialCertificates);
    const [actioning, setActioning] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    

    const fetchPending = async () => {
        const res = await apiFetch("/api/admin/certificates");
        if (res.ok) {
            const data = await res.json();
            setCertificates(data);
        }
    };

    const handleVerify = async (id: string, isVerified: boolean, tier: number) => {
        setActioning(id);
        try {
            const res = await apiFetch("/api/admin/certificates", {
                method: "PATCH",
                body: JSON.stringify({ certificateId: id, isVerified, verificationTier: tier }),
                headers: { "Content-Type": "application/json" },
            });
            if (res.ok) {
                toast.success(`Certificate ${isVerified ? "verified" : "rejected"}.`);
                await fetchPending();
            } else {
                toast.error("Verification failed.");
            }
        } finally {
            setActioning(null);
        }
    };

    const filteredCerts = certificates.filter(c => 
        c.title.toLowerCase().includes(search.toLowerCase()) || 
        c.job_seekers?.full_name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6 pb-20">
            <PageHeader 
                title="Certificate Verifications" 
                subtitle="Review and verify professional credentials to increase talent trust." 
            />

            <div className="relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                    type="text"
                    placeholder="Search by title or candidate..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-2xl border border-stone-200 bg-white px-12 py-3 text-sm outline-none focus:border-stone-300 dark:border-slate-700 dark:bg-slate-900"
                />
            </div>

            <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/70">
                <div className="grid grid-cols-1 gap-2 border-b border-stone-200/70 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:border-slate-800 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]">
                    <span>Certificate & Candidate</span>
                    <span>Issuer</span>
                    <span className="sm:text-right">Action</span>
                </div>

                {filteredCerts.length === 0 ? (
                    <div className="px-6 py-16 text-center">
                        <Award className="mx-auto text-slate-300 dark:text-slate-700" size={32} />
                        <p className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">No pending verifications.</p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">All credentials have been reviewed.</p>
                    </div>
                ) : (
                    filteredCerts.map((cert) => (
                        <div key={cert.id} className="grid grid-cols-1 gap-4 border-b border-stone-200/70 px-4 py-4 last:border-b-0 dark:border-slate-800 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-center">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{cert.title}</p>
                                    {cert.credential_url && (
                                        <a href={cert.credential_url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                                            <ExternalLink size={14} />
                                        </a>
                                    )}
                                </div>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                    {cert.job_seekers?.full_name || "Unknown Candidate"} · {cert.issue_date}
                                </p>
                            </div>

                            <div className="text-sm text-slate-600 dark:text-slate-400">
                                {cert.issuer || "Not specified"}
                            </div>

                            <div className="flex items-center gap-2 sm:justify-end">
                                <button
                                    onClick={() => handleVerify(cert.id, true, 1)}
                                    disabled={actioning === cert.id}
                                    className="rounded-xl border border-stone-200 p-2 text-slate-500 hover:text-emerald-600 dark:border-slate-700 dark:text-slate-300"
                                    title="Verify Certificate"
                                >
                                    {actioning === cert.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                                </button>
                                <button
                                    onClick={() => handleVerify(cert.id, false, -1)}
                                    disabled={actioning === cert.id}
                                    className="rounded-xl border border-stone-200 p-2 text-slate-500 hover:text-red-600 dark:border-slate-700 dark:text-slate-300"
                                    title="Reject Certificate"
                                >
                                    <XCircle size={16} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
