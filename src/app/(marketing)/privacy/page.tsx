import { Metadata } from 'next';
import { EyeOff, Database, Bot, RefreshCw, Key, ShieldCheck } from 'lucide-react';
import React from 'react';

export const metadata: Metadata = {
    title: 'Privacy Pulse | WorkBridge',
    description: 'Learn how WorkBridge protects your data with Zero-Bias architecture and secure AI integrations.',
};

const principles = [
    {
        title: "Zero-Bias Anonymization Protocol",
        icon: <EyeOff className="text-purple-500" size={24} />,
        content: `To ensure meritocratic hiring, WorkBridge institutes a Zero-Bias Discovery engine. When an employer browses the talent pipeline, Job Seeker names, photos, and direct contact details are redacted. The identity is only unmasked when the employer issues an official "Shortlist" invitation.`
    },
    {
        title: "Generative AI Synthesis Privacy",
        icon: <Bot className="text-blue-500" size={24} />,
        content: `Employers can utilize our "✨ AI Resume" feature, which synthesizes candidate data into tailored documents. WorkBridge utilizes Google Gemini under strict prompt constraints. The AI is specifically instructed to refer to the individual anonymously as "Candidate #101". The actual identity strings are stripped before transmission to external inference endpoints, protecting your PII from foundational model retention.`
    },
    {
        title: "Cryptographic Data Storage",
        icon: <Database className="text-emerald-500" size={24} />,
        content: `Your profile data, uploaded PDF certificates, and interaction metrics are securely stored utilizing Supabase. Row Level Security (RLS) policies structurally prevent unauthorized horizontal access. A Job Seeker's certificates can only be accessed by the seeker or strictly authorized endpoints executing the AI matching pipeline.`
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
        <main className="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] pt-32 pb-24 relative overflow-hidden">
            <div className="absolute top-20 right-20 w-72 h-72 bg-emerald-500/10 dark:bg-emerald-600/5 blur-[100px] rounded-full pointer-events-none" />
            <div className="absolute bottom-20 left-20 w-96 h-96 bg-blue-500/10 dark:bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />

            <div className="max-w-5xl mx-auto px-6 relative z-10">
                <div className="text-center mb-20 space-y-6">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-[2rem] shadow-xl mb-2 group cursor-pointer hover:scale-105 transition-transform duration-500 border border-slate-200 dark:border-slate-700">
                        <ShieldCheck size={32} className="text-slate-900 dark:text-white" />
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tight">Privacy Pulse</h1>
                    <p className="text-lg text-slate-600 dark:text-slate-400 font-medium max-w-2xl mx-auto leading-relaxed">
                        Data ethics is not an afterthought at WorkBridge. We strictly isolate your personally identifiable information from bias vectors and external endpoints.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {principles.map((item, idx) => (
                        <div
                            key={idx}
                            className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 p-8 rounded-[2rem] shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 group relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-slate-100 to-transparent dark:from-slate-800/50 opacity-50 rounded-bl-[4rem]" />
                            <div className="relative z-10 space-y-5">
                                <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center shadow-sm">
                                    {item.icon}
                                </div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                                    {item.title}
                                </h3>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                                    {item.content}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-20 p-8 md:p-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[3rem] text-center shadow-2xl shadow-blue-500/20 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
                    <div className="relative z-10 space-y-4">
                        <h4 className="text-2xl md:text-3xl font-black text-white">Your Consent</h4>
                        <p className="text-blue-100 font-medium max-w-2xl mx-auto leading-relaxed">
                            By interacting with the WorkBridge platform, authenticating via Supabase, and uploading academic credentials, you consent to this architectural privacy protocol.
                        </p>
                    </div>
                </div>
            </div>
        </main>
    );
}
