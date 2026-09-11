import type { Metadata } from "next";
import dynamic from "next/dynamic";
import {
    HeroSection,
    PlatformHighlights,
    FinalCTA,
} from "@/components/marketing/HeroSections";

// Lazy load heavier components
const HowItWorks = dynamic(() => import("@/components/marketing/HowItWorks"), { ssr: true });
const FAQ = dynamic(() => import("@/components/marketing/FAQ"), { ssr: true });
const LogoMarquee = dynamic(() => import("@/components/marketing/LogoMarquee"), { ssr: true });

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
        <div className="pb-16 overflow-x-hidden space-y-4 sm:space-y-8">
            {/* 1. Hero Section */}
            <HeroSection />
            
            {/* 2. Trust Signals Marquee */}
            <div className="max-w-6xl mx-auto text-center py-6 px-4">
                <p className="text-slate-400 font-black tracking-[0.25em] uppercase text-[10px] mb-4 dark:text-slate-500">
                    Opportunities from companies &amp; organizations across Malawi
                </p>
                <LogoMarquee />
            </div>

            {/* 3. Stat Bar & How It Works Process Flow */}
            <PlatformHighlights />
            <HowItWorks />

            {/* 4. Streamlined Consolidated Dual Showcase (Seekers & Graduates + Employers & White-Glove Concierge) */}
            <FinalCTA />

            {/* 5. Minimal Collapsible FAQ */}
            <FAQ />
        </div>
    );
}

