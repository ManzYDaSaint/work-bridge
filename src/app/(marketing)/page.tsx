import Link from "next/link";
import { constructMetadata } from "@/lib/seo";
import PricingSection from "@/components/marketing/PricingSection";
import LogoMarquee from "@/components/marketing/LogoMarquee";

export const metadata = constructMetadata({
    title: "WorkBridge",
    description:
        "A modern Malawian job board for remote, hybrid, and on-site roles across every serious team.",
    canonical: "/",
});

export default function LandingPage() {
    return (
        <div className="px-4 sm:px-6 pb-20">
            <section className="max-w-6xl mx-auto pt-20 sm:pt-24 pb-10">
                <div className="rounded-[2rem] border border-stone-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm px-6 sm:px-10 py-10 sm:py-14 shadow-[0_20px_80px_-50px_rgba(17,24,39,0.35)]">
                    <div className="max-w-3xl space-y-6">
                        <p className="inline-flex items-center rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-stone-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            Malawi-first. Globally relevant.
                        </p>
                        <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight text-slate-900 dark:text-white leading-[1.02]">
                            A cleaner way to find work across <span className="text-[#a65a2e]">Malawi</span>, remote teams, and everywhere between.
                        </h1>
                        <p className="max-w-2xl text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                            WorkBridge is a modern job board for remote, hybrid, and on-site roles. Fast browsing, calm design, and a stronger local point of view.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-8">
                        <Link
                            href="/jobs"
                            className="inline-flex items-center justify-center rounded-xl bg-[#16324f] px-5 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                        >
                            Browse the board
                        </Link>
                        <Link
                            href="/register?role=employer"
                            className="inline-flex items-center justify-center rounded-xl border border-stone-300 dark:border-slate-600 px-5 py-3 text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-stone-50 dark:hover:bg-slate-800/80 transition-colors"
                        >
                            List a role
                        </Link>
                    </div>
                </div>
            </section>

            <section className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 mb-20">
                {[
                    ["Remote, hybrid, on-site", "Built for the full market, not one niche."],
                    ["Made to scan quickly", "Dense listings, clear filters, less noise."],
                    ["Malawian flagship", "Local credibility without looking provincial."],
                ].map(([title, body]) => (
                    <div key={title} className="rounded-[1.5rem] border border-stone-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/50 px-5 py-5">
                        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h2>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{body}</p>
                    </div>
                ))}
            </section>

            <PricingSection />

            {/* Bottom Trust Section */}
            <div className="max-w-7xl mx-auto text-center mt-32">
                <p className="text-slate-500 font-bold tracking-widest uppercase text-xs mb-10">Trusted by leading companies worldwide</p>
                <LogoMarquee />
            </div>
        </div>
    );
}

