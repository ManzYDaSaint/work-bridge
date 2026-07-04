import type { Metadata } from "next";
import dynamic from "next/dynamic";
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
