import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Briefcase, ArrowRight } from "lucide-react";
import {
    HeroSection,
    AudienceCards,
    PlatformHighlights,
    StudentCallout,
    FinalCTA,
} from "@/components/marketing/HeroSections";

// Lazy load heavier sections — they are already "use client" internally
const HowItWorks = dynamic(() => import("@/components/marketing/HowItWorks"), { ssr: true });
const Features = dynamic(() => import("@/components/marketing/Features"), { ssr: true });
const FAQ = dynamic(() => import("@/components/marketing/FAQ"), { ssr: true });

export const metadata: Metadata = {
    title: "Aganyu | Malawi's Modern Job Board & Talent Marketplace",
    description:
        "Aganyu is Malawi's #1 job board for remote, hybrid, and on-site roles. Build your profile, get discovered by employers, and apply to top companies — for free.",
    keywords: [
        "Jobs in Malawi",
        "Malawi job board",
        "Remote jobs Malawi",
        "Hybrid jobs Malawi",
        "Job seeker Malawi",
        "Hire talent Malawi",
        "Recruitment Malawi",
        "Internship Malawi",
        "Graduate jobs Malawi",
        "Aganyu",
    ],
    alternates: {
        canonical: "/",
    },
    openGraph: {
        title: "Aganyu | Malawi's Modern Job Board & Talent Marketplace",
        description:
            "Browse remote, hybrid, and on-site roles from top Malawian employers. Create a free profile and get discovered today.",
        url: "/",
        type: "website",
        images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Aganyu — Malawi's modern job board" }],
    },
    twitter: {
        card: "summary_large_image",
        title: "Aganyu | Malawi's Modern Job Board",
        description: "Browse remote, hybrid, and on-site roles from top Malawian employers.",
        images: ["/og-image.png"],
        creator: "@aganyu",
    },
};

export default function LandingPage() {
    return (
        <div className="pb-20 overflow-x-hidden">
            <HeroSection />
            <AudienceCards />
            <PlatformHighlights />
            <HowItWorks />
            <Features />
            <StudentCallout />
            
            {/* Concierge Posting Section */}
            <section className="px-4 sm:px-6 max-w-6xl mx-auto py-16">
                <div className="relative rounded-[2.5rem] bg-slate-900 border border-slate-800 text-white p-8 sm:p-12 shadow-2xl overflow-hidden">
                    <div className="absolute -bottom-10 -right-10 w-80 h-80 bg-indigo-500/10 blur-[90px] rounded-full pointer-events-none" />
                    
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
                        <div className="lg:col-span-7 space-y-5">
                            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1 text-xs font-semibold text-sky-300 border border-white/10 backdrop-blur">
                                <Briefcase size={14} className="text-sky-400" /> White-Glove Concierge Hiring
                            </span>
                            
                            <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                                Prefer we handle the posting &amp; filtering for you?
                            </h3>

                            <p className="text-sm sm:text-base text-slate-300 font-normal leading-relaxed">
                                No time to manage a dashboard? Simply email your job description to <strong className="text-sky-400 font-semibold underline">jobs@aganyu.com</strong>. Our team formats your vacancy, broadcasts it to thousands across social media, and forwards top-matched candidates directly to your inbox.
                            </p>

                            <div className="pt-2 flex flex-wrap items-center gap-4">
                                <a 
                                    href="mailto:jobs@aganyu.com" 
                                    className="inline-flex items-center justify-center gap-2.5 rounded-2xl bg-white text-slate-900 hover:bg-sky-50 px-8 py-4 text-sm font-bold transition-all shadow-lg active:scale-95 group"
                                >
                                    Email Your Vacancy
                                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                </a>
                                <span className="text-xs text-slate-400 font-medium">
                                    ⚡ 24-hour setup turnaround
                                </span>
                            </div>
                        </div>

                        {/* 3-Step Process Mini-Widget */}
                        <div className="lg:col-span-5">
                            <div className="rounded-3xl bg-slate-950/80 border border-slate-800 p-6 space-y-3.5 shadow-inner">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block border-b border-slate-800 pb-2">
                                    White-Glove Process Flow
                                </span>

                                <div className="space-y-3 text-xs">
                                    <div className="flex items-start gap-3">
                                        <span className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
                                            1
                                        </span>
                                        <div>
                                            <p className="font-bold text-white">Email your job description</p>
                                            <p className="text-[11px] text-slate-400">Send raw PDF or text to jobs@aganyu.com</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
                                            2
                                        </span>
                                        <div>
                                            <p className="font-bold text-white">Automated Social Broadcast</p>
                                            <p className="text-[11px] text-slate-400">Published &amp; shared to LinkedIn &amp; Facebook Pages</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
                                            3
                                        </span>
                                        <div>
                                            <p className="font-bold text-white">Receive Top Candidates</p>
                                            <p className="text-[11px] text-slate-400">Curated shortlists delivered straight to your email</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <FAQ />
            <FinalCTA />

            {/* Companies hiring trust signal */}
            <div className="max-w-7xl mx-auto text-center pb-24 px-4">
                <p className="text-slate-400 font-black tracking-[0.3em] uppercase text-[10px] mb-10 dark:text-slate-600">
                    Companies hiring on Aganyu
                </p>
            </div>
        </div>
    );
}
