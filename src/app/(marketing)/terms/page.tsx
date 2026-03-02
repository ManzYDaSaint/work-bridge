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
        content: `Seekers have the ability to upload up to 5 academic or professional certificates. You explicitly consent to WorkBridge utilizing AI-driven extraction systems to parse these PDF documents. The system will attempt to match the "Awarded To" name against your registered profile name. Uploading forged documents or documents belonging to another individual is a severe violation of these Terms and will result in a permanent ban and potential referral to relevant authorities.`
    },
    {
        title: "3. Precision AI Matching & Recruiting",
        icon: <BookOpen className="text-emerald-500" size={24} />,
        content: `Our AI Semantic Engine generates Match Scores (0-100) based on your skills, experience, and verified certificates relative to employer job descriptions. WorkBridge does not guarantee employment or interview placements. The Match Score is an algorithmic tool designed to assist employers in Zero-Bias discovery. Employers utilize this tool at their own discretion.`
    },
    {
        title: "4. Subscription Billing & Mobile Money",
        icon: <Briefcase className="text-indigo-500" size={24} />,
        content: `Employers may be subject to subscription fees to access premium features like instant candidate shortlisting and AI Resume synthesis. Payments are processed securely via Flutterwave, supporting local methods including Airtel Money and TNM Mpamba. All transactions are billed in Malawian Kwacha (MWK) unless stated otherwise. Subscriptions are strictly non-refundable once the billing cycle initiates.`
    },
    {
        title: "5. Platform Moderation & Audit Registry",
        icon: <AlertCircle className="text-rose-500" size={24} />,
        content: `WorkBridge maintains an immutable Audit Registry. All administrative actions, critical account modifications, and systemic changes are recorded. Our administrators reserve the right to moderate, edit, or entirely remove job postings that violate local labor laws, contain discriminatory language, or are deemed fraudulent. We reserve the right to terminate access to any user found circumventing our security architectures.`
    }
];

export default function TermsPage() {
    return (
        <main className="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] pt-32 pb-24 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-500/10 dark:bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-purple-500/10 dark:bg-purple-600/5 blur-[150px] rounded-full pointer-events-none" />

            <div className="max-w-4xl mx-auto px-6 relative z-10">
                <div className="text-center mb-16 space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold text-[10px] uppercase tracking-[0.2em] mb-4">
                        <CheckCircle size={14} /> Official Implementation
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tight">Terms of Service</h1>
                    <p className="text-lg text-slate-500 dark:text-slate-400 font-medium">Effective Date: February 2026. Governing the digital operational standards of the WorkBridge platform.</p>
                </div>

                <div className="space-y-8">
                    {sections.map((section, idx) => (
                        <div
                            key={idx}
                            className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 p-8 md:p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/20 dark:shadow-none hover:shadow-2xl hover:border-blue-500/30 transition-all duration-500 group"
                        >
                            <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
                                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-500">
                                    {section.icon}
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">{section.title}</h3>
                                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                        {section.content}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-16 text-center border-t border-slate-200 dark:border-slate-800 pt-12">
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                        Questions? Reach our compliance architecture team at <a href="mailto:legal@workbridge.mw" className="text-blue-600 hover:text-blue-700">legal@workbridge.mw</a>
                    </p>
                </div>
            </div>
        </main>
    );
}
