import { Metadata } from 'next';
import { Shield, BookOpen, AlertCircle, Briefcase, FileText, CheckCircle } from 'lucide-react';
import React from 'react';

export const metadata: Metadata = {
    title: 'Terms of Service | WorkBridge',
    description: 'Detailed Terms of Service and Operational agreements for using the WorkBridge platform.',
};

const sections = [
    {
        title: "1. Platform Architecture & User Integrity",
        icon: <Shield className="text-blue-500" size={24} />,
        content: `WorkBridge operates a dual-sided marketplace consisting of "Job Seekers" and "Employers". By registering for either account type, you agree to provide completely accurate, current, and verifiable information. Employers are subject to manual administrative verification and may remain in a "PENDING" status until approved by our compliance team. Job Seekers must ensure maintaining accurate profiles. Fake or completely misrepresented profiles will trigger immediate administrative suspension.`
    },
    {
        title: "2. Verifiable Credentials & Document Parsing",
        icon: <FileText className="text-purple-500" size={24} />,
        content: `Seekers have the ability to upload up to 5 academic or professional certificates. These documents may be stored and reviewed within the platform to support candidate evaluation. Uploading forged documents or documents belonging to another individual is a severe violation of these Terms and will result in a permanent ban and potential referral to relevant authorities.`
    },
    {
        title: "3. Structured Matching & Recruiting",
        icon: <BookOpen className="text-emerald-500" size={24} />,
        content: `WorkBridge uses structured requirements, screening questions, and profile data to help employers review candidates consistently. WorkBridge does not guarantee employment or interview placements. Employers remain responsible for their own hiring decisions.`
    },
    {
        title: "4. Subscription Billing & Mobile Money",
        icon: <Briefcase className="text-indigo-500" size={24} />,
        content: `Employers may be subject to subscription fees to access premium features like expanded listing capacity and faster candidate workflow tools. Payments are processed securely via PayChangu, supporting local methods including Airtel Money and TNM Mpamba. All transactions are billed in Malawian Kwacha (MWK) unless stated otherwise. Subscriptions are strictly non-refundable once the billing cycle initiates.`
    },
    {
        title: "5. Platform Moderation & Audit Registry",
        icon: <AlertCircle className="text-rose-500" size={24} />,
        content: `WorkBridge maintains an immutable Audit Registry. All administrative actions, critical account modifications, and systemic changes are recorded. Our administrators reserve the right to moderate, edit, or entirely remove job postings that violate local labor laws, contain discriminatory language, or are deemed fraudulent. We reserve the right to terminate access to any user found circumventing our security architectures.`
    }
];

export default function TermsPage() {
    return (
        <main className="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] pt-24 pb-20 sm:pt-32 sm:pb-24 relative overflow-hidden">
            {/* Subtle Background Elements */}
            <div className="absolute top-[-5%] right-[-5%] w-[400px] h-[400px] bg-blue-500/5 dark:bg-blue-600/5 blur-[100px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-5%] left-[-5%] w-[500px] h-[500px] bg-purple-500/5 dark:bg-purple-600/5 blur-[120px] rounded-full pointer-events-none" />

            <div className="max-w-4xl mx-auto px-6 relative z-10">
                <div className="text-center mb-16 space-y-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-stone-200 bg-stone-50 dark:border-slate-700 dark:bg-slate-800 text-stone-600 dark:text-slate-300 font-bold text-[10px] uppercase tracking-[0.18em] mb-2">
                        <CheckCircle size={14} /> Official Implementation
                    </div>
                    <h1 className="text-4xl md:text-6xl font-semibold text-slate-900 dark:text-white tracking-tight leading-[1.05]">
                        Terms of Service
                    </h1>
                    <p className="text-lg text-slate-600 dark:text-slate-400 font-medium max-w-2xl mx-auto leading-relaxed">
                        Effective Date: February 2026. Governing the digital operational standards of the WorkBridge platform.
                    </p>
                </div>

                <div className="space-y-6 sm:space-y-8">
                    {sections.map((section, idx) => (
                        <div
                            key={idx}
                            className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm border border-stone-200/80 dark:border-slate-800 p-8 sm:p-10 rounded-[2rem] shadow-[0_20px_40px_-30px_rgba(17,24,39,0.15)] hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.1)] transition-all duration-500 group"
                        >
                            <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-start">
                                <div className="w-14 h-14 rounded-2xl bg-stone-50 dark:bg-slate-800/80 border border-stone-200 dark:border-slate-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-500 shadow-sm">
                                    {section.icon}
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-xl md:text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
                                        {section.title}
                                    </h3>
                                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                        {section.content}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-20 p-10 rounded-[2rem] border border-stone-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/50 text-center relative overflow-hidden">
                    <div className="relative z-10 space-y-4">
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-[0.15em]">
                            Questions? Reach our compliance team
                        </p>
                        <a
                            href="mailto:legal@workbridge.mw"
                            className="text-lg font-semibold text-[#16324f] dark:text-blue-400 hover:text-[#a65a2e] dark:hover:text-blue-300 transition-colors underline underline-offset-4"
                        >
                            legal@workbridge.mw
                        </a>
                    </div>
                </div>
            </div>
        </main>
    );
}
