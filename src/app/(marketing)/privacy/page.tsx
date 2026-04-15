import { Metadata } from 'next';
import { EyeOff, Database, Bot, RefreshCw, Key, ShieldCheck } from 'lucide-react';
import React from 'react';

export const metadata: Metadata = {
    title: 'Privacy Pulse | WorkBridge',
    description: 'Learn how WorkBridge protects your data with privacy-first hiring flows and secure data handling.',
};

const principles = [
    {
        title: "Zero-Bias Anonymization Protocol",
        icon: <EyeOff className="text-purple-500" size={24} />,
        content: `To ensure meritocratic hiring, WorkBridge institutes a Zero-Bias Discovery engine. When an employer browses the talent pipeline, Job Seeker names, photos, and direct contact details are redacted. The identity is only unmasked when the employer issues an official "Shortlist" invitation.`
    },
    {
        title: "Structured Screening Privacy",
        icon: <Bot className="text-blue-500" size={24} />,
        content: `Employers review structured candidate information such as skills, experience, and screening answers before any full profile reveal. WorkBridge keeps identifying details separate from early screening so hiring decisions can begin from relevant qualifications instead of personal identity.`
    },
    {
        title: "Cryptographic Data Storage",
        icon: <Database className="text-emerald-500" size={24} />,
        content: `Your profile data, uploaded PDF certificates, and interaction metrics are securely stored utilizing Supabase. Row Level Security (RLS) policies structurally prevent unauthorized horizontal access. A Job Seeker's certificates can only be accessed by the seeker or strictly authorized product flows.`
    },
    {
        title: "Audit Logging & Observability",
        icon: <ShieldCheck className="text-rose-500" size={24} />,
        content: `We run an internal Audit Registry tracking systemic mutations (e.g., job approvals, ban issuances, security re-configurations). These logs may record IP addresses and timestamped vectors strictly for operational continuity, security incident investigation, and regulatory compliance. They remain isolated from marketing tools.`
    },
    {
        title: "Multi-Factor Continuity",
        icon: <Key className="text-amber-500" size={24} />,
        content: `WorkBridge encourages robust authentication. Backup recovery codes are hashed cryptographically upon generation. Staff members within the Admin Dashboard cannot view your plaintext passwords or your raw generated MFA seeds.`
    },
    {
        title: "Data Deletion & Extraction",
        icon: <RefreshCw className="text-indigo-500" size={24} />,
        content: `You possess the right to erasure. When you delete a certificate, the asset is removed from our storage buckets and instantly decoupled from the database. Should you choose to delete your account, your profile is purged, and any associated job applications are marked abandoned.`
    }
];

export default function PrivacyPage() {
    return (
        <main className="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] pt-24 pb-20 sm:pt-32 sm:pb-24 relative overflow-hidden">
            {/* Subtle Background Elements */}
            <div className="absolute top-20 right-[-5%] w-72 h-72 bg-emerald-500/5 dark:bg-emerald-600/5 blur-[100px] rounded-full pointer-events-none" />
            <div className="absolute bottom-20 left-[-5%] w-96 h-96 bg-blue-500/5 dark:bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />

            <div className="max-w-4xl mx-auto px-6 relative z-10">
                <div className="text-center mb-16 space-y-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-white dark:bg-slate-800 rounded-[1.5rem] shadow-sm mb-2 border border-stone-200 dark:border-slate-700">
                        <ShieldCheck size={28} className="text-slate-900 dark:text-white" />
                    </div>
                    <h1 className="text-4xl md:text-6xl font-semibold text-slate-900 dark:text-white tracking-tight leading-[1.05]">
                        Privacy Pulse
                    </h1>
                    <p className="text-lg text-slate-600 dark:text-slate-400 font-medium max-w-2xl mx-auto leading-relaxed">
                        Data ethics is not an afterthought at WorkBridge. We strictly isolate your personally identifiable information from early screening workflows.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                    {principles.map((item, idx) => (
                        <div
                            key={idx}
                            className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm border border-stone-200/80 dark:border-slate-800 p-8 rounded-[2rem] shadow-[0_20px_40px_-30px_rgba(17,24,39,0.15)] hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.1)] transition-all duration-500 group relative overflow-hidden"
                        >
                            <div className="relative z-10 space-y-5">
                                <div className="w-12 h-12 rounded-xl bg-stone-50 dark:bg-slate-800/80 border border-stone-200 dark:border-slate-700 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-500">
                                    {item.icon}
                                </div>
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight">
                                    {item.title}
                                </h3>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                                    {item.content}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-20 p-8 md:p-12 bg-[#16324f] dark:bg-slate-900 rounded-[2.5rem] text-center shadow-xl relative overflow-hidden border border-stone-200/10 dark:border-slate-800">
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none" />
                    <div className="relative z-10 space-y-4">
                        <h4 className="text-2xl font-semibold text-white">Your Consent</h4>
                        <p className="text-blue-100/80 font-medium max-w-2xl mx-auto leading-relaxed italic">
                            By interacting with the WorkBridge platform, authenticating via Supabase, and uploading academic credentials, you consent to this architectural privacy protocol.
                        </p>
                    </div>
                </div>
            </div>
        </main>
    );
}
