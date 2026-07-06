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
                <div className="rounded-[2.5rem] border border-stone-200 bg-stone-50 dark:border-slate-800 dark:bg-slate-900/50 p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="max-w-2xl space-y-4">
                        <div className="inline-flex items-center gap-2 rounded-full bg-white dark:bg-slate-800 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 border border-stone-200 dark:border-slate-700">
                            <Briefcase size={12} /> For Busy Employers
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                            Prefer we handle the posting for you?
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                            If you don't have time to set up a dashboard, simply email your vacancy to <span className="text-[#16324f] dark:text-sky-400 font-bold">jobs@aganyu.com</span>. We'll post the job for you and forward the most compatible matches directly to your inbox for a small service fee.
                        </p>
                    </div>
                    <a 
                        href="mailto:jobs@aganyu.com" 
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white dark:bg-slate-800 border-2 border-stone-200 dark:border-slate-700 px-8 py-4 text-base font-bold text-slate-800 dark:text-white hover:bg-stone-50 dark:hover:bg-slate-700 transition-all shadow-sm"
                    >
                        Send Vacancy <ArrowRight size={18} />
                    </a>
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
