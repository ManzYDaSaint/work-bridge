import { Metadata } from 'next';
import { EyeOff, Database, Bot, RefreshCw, Key, ShieldCheck, Chrome } from 'lucide-react';
import React from 'react';

export const metadata: Metadata = {
    title: 'Privacy Policy | Aganyu',
    description: 'Learn how Aganyu protects your data, handles Google Sign-In, and ensures privacy-first hiring flows.',
};

const principles = [
    {
        title: "Zero-Bias Anonymization Protocol",
        icon: <EyeOff className="text-purple-500" size={24} />,
        content: `To ensure meritocratic hiring, Aganyu institutes a Zero-Bias Discovery engine. When an employer browses the talent pipeline, Job Seeker names, photos, and direct contact details are redacted. The identity is only unmasked when the employer issues an official "Shortlist" invitation.`
    },
    {
        title: "Structured Screening Privacy",
        icon: <Bot className="text-blue-500" size={24} />,
        content: `Employers review structured candidate information such as skills, experience, and screening answers before any full profile reveal. Aganyu keeps identifying details separate from early screening so hiring decisions can begin from relevant qualifications instead of personal identity.`
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
        content: `Aganyu encourages robust authentication. Backup recovery codes are hashed cryptographically upon generation. Staff members within the Admin Dashboard cannot view your plaintext passwords or your raw generated MFA seeds.`
    },
    {
        title: "Data Deletion & Extraction",
        icon: <RefreshCw className="text-indigo-500" size={24} />,
        content: `You possess the right to erasure. When you delete a certificate, the asset is removed from our storage buckets and instantly decoupled from the database. Should you choose to delete your account, your profile is purged, and any associated job applications are marked abandoned.`
    }
];

const googleDataItems = [
    {
        label: "Data Accessed",
        content: `When you choose "Sign in with Google" or "Continue with Google", Aganyu requests the following Google account data via OAuth 2.0: your name (given name and family name), your primary Google email address, and your Google profile picture URL. These correspond to the standard OpenID Connect scopes: openid, email, and profile. No other Google data — including Google Drive, Gmail, Contacts, Calendar, or any other Google service — is accessed or requested.`
    },
    {
        label: "Data Usage",
        content: `The Google account data retrieved at sign-in is used exclusively to create and authenticate your Aganyu account. Specifically: your email address is used as your unique account identifier and for sending transactional notifications (e.g., job application updates); your name is used to pre-populate your Aganyu profile display name; and your profile picture URL may be used as your default avatar. This data is never used for advertising, remarketing, or sold to third parties.`
    },
    {
        label: "Data Storage",
        content: `Your Google-sourced account data (email, name, avatar URL) is stored in Aganyu's secure database hosted on Supabase (EU region). It is retained for as long as your account is active. Row-Level Security (RLS) policies are enforced at the database layer to prevent any unauthorized access. You may delete your account at any time, which permanently removes all associated data from our systems.`
    },
    {
        label: "Data Sharing",
        content: `Aganyu does not share your Google user data with any third parties, advertisers, or data brokers. Your Google data is accessible only to Aganyu's core application infrastructure. The OAuth token issued by Google is handled entirely by Supabase Auth on your behalf and is not stored or logged by Aganyu's application layer. No Google user data is transferred to any analytics, marketing, or external service.`
    },
    {
        label: "Revoking Access",
        content: `You may revoke Aganyu's access to your Google account at any time by visiting your Google Account Permissions page at myaccount.google.com/permissions and removing Aganyu from the list of connected apps. Revoking access does not delete your Aganyu account — you may still log in with a password if one is set, or request account deletion via our support channel.`
    }
];

export default function PrivacyPage() {
    return (
        <main className="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] pt-24 pb-20 sm:pt-32 sm:pb-24 relative overflow-hidden">
            {/* Background blobs */}
            <div className="absolute top-20 right-[-5%] w-72 h-72 bg-emerald-500/5 dark:bg-emerald-600/5 blur-[100px] rounded-full pointer-events-none" />
            <div className="absolute bottom-20 left-[-5%] w-96 h-96 bg-blue-500/5 dark:bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />

            <div className="max-w-4xl mx-auto px-6 relative z-10">

                {/* Header */}
                <div className="text-center mb-16 space-y-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-white dark:bg-slate-800 rounded-[1.5rem] shadow-sm mb-2 border border-stone-200 dark:border-slate-700">
                        <ShieldCheck size={28} className="text-slate-900 dark:text-white" />
                    </div>
                    <h1 className="text-4xl md:text-6xl font-semibold text-slate-900 dark:text-white tracking-tight leading-[1.05]">
                        Privacy Policy
                    </h1>
                    <p className="text-lg text-slate-600 dark:text-slate-400 font-medium max-w-2xl mx-auto leading-relaxed">
                        Data ethics is not an afterthought at Aganyu. We strictly isolate your personally identifiable information from early screening workflows.
                    </p>
                    <p className="text-sm text-slate-400 dark:text-slate-500">Last updated: June 2026</p>
                </div>

                {/* Platform Privacy Principles */}
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

                {/* ── Google API Services User Data Disclosure ── */}
                <div className="mt-20">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 flex items-center justify-center shadow-sm flex-shrink-0">
                            <Chrome size={22} className="text-blue-500" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
                                Google Sign-In &amp; User Data
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                Required disclosure under the{' '}
                                <a
                                    href="https://developers.google.com/terms/api-services-user-data-policy"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-500 hover:underline"
                                >
                                    Google API Services User Data Policy
                                </a>
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {googleDataItems.map((item, idx) => (
                            <div
                                key={idx}
                                className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm border border-stone-200/80 dark:border-slate-800 p-7 rounded-2xl"
                            >
                                <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2">
                                    {item.label}
                                </h3>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                                    {item.content}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* Limited Use Disclosure */}
                    <div className="mt-6 p-6 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-2xl">
                        <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-1">
                            Limited Use Disclosure
                        </p>
                        <p className="text-sm text-blue-600 dark:text-blue-400 leading-relaxed">
                            Aganyu's use and transfer of information received from Google APIs adheres to the{' '}
                            <a
                                href="https://developers.google.com/terms/api-services-user-data-policy#additional_requirements_for_specific_api_scopes"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline hover:text-blue-800 dark:hover:text-blue-200"
                            >
                                Google API Services User Data Policy
                            </a>
                            , including the Limited Use requirements. Google user data is used only to provide and improve the Aganyu service and is not used to serve advertisements.
                        </p>
                    </div>
                </div>

                {/* Consent Banner */}
                <div className="mt-16 p-8 md:p-12 bg-[#16324f] dark:bg-slate-900 rounded-[2.5rem] text-center shadow-xl relative overflow-hidden border border-stone-200/10 dark:border-slate-800">
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none" />
                    <div className="relative z-10 space-y-4">
                        <h4 className="text-2xl font-semibold text-white">Your Consent</h4>
                        <p className="text-blue-100/80 font-medium max-w-2xl mx-auto leading-relaxed italic">
                            By interacting with the Aganyu platform, authenticating via Supabase or Google Sign-In, and uploading academic credentials, you consent to this privacy policy. For questions, contact{' '}
                            <a href="mailto:privacy@aganyu.com" className="underline text-blue-200 hover:text-white">
                                privacy@aganyu.com
                            </a>.
                        </p>
                    </div>
                </div>

            </div>
        </main>
    );
}
