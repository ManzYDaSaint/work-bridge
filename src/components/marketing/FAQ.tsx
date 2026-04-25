"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
    {
        q: "Who is WorkBridge for?",
        a: "WorkBridge is for anyone in Malawi looking for work, internships, or attachments — and for employers and recruiters who want to find great local talent. Students and fresh graduates are especially welcome.",
    },
    {
        q: "How does the Talent Marketplace work?",
        a: "Job seekers build a full professional profile with their skills, experience, and certifications. Employers can then search this pool and filter by skill, seniority, and search intent. Both sides are matched automatically based on skills.",
    },
    {
        q: "Can employers contact candidates directly?",
        a: "Yes. Employers can send a direct 'Invite to Apply' message to any visible candidate directly on the platform — no external email or phone call needed to make initial contact.",
    },
    {
        q: "What are the profile visibility options?",
        a: "Seekers choose one of three visibility levels: Public (full profile visible), Anonymous (skills and experience visible but name and contacts hidden), or Hidden (does not appear in any employer search).",
    },
    {
        q: "How does skill-based matching work?",
        a: "When an employer posts a job, WorkBridge immediately surfaces candidates whose listed skills overlap with the job's requirements. Seekers also see a 'Recommended for You' widget showing active jobs that match their skills.",
    },
    {
        q: "Is there a free plan?",
        a: "Yes. Both seekers and employers can use the platform's core features for free. Premium plans unlock extras like profile badges, priority visibility, and additional employer features.",
    },
];

export default function FAQ() {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    return (
        <section id="faq" className="py-24 bg-white dark:bg-slate-950">
            <div className="max-w-3xl mx-auto px-4 sm:px-6">
                <div className="text-center mb-14">
                    <p className="inline-flex items-center rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-stone-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 mb-4">
                        FAQ
                    </p>
                    <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
                        Common questions
                    </h2>
                    <p className="mt-4 text-base text-slate-500 dark:text-slate-400">
                        Everything you need to know about getting started.
                    </p>
                </div>

                <div className="space-y-3">
                    {faqs.map((faq, i) => (
                        <div
                            key={i}
                            className="rounded-2xl border border-stone-200 bg-stone-50 dark:border-slate-800 dark:bg-slate-900 overflow-hidden"
                        >
                            <button
                                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                                className="flex w-full items-center justify-between px-6 py-5 text-left"
                            >
                                <span className="text-sm font-semibold text-slate-900 dark:text-white pr-4">
                                    {faq.q}
                                </span>
                                <ChevronDown
                                    size={18}
                                    className={`flex-shrink-0 text-slate-400 transition-transform duration-200 ${openIndex === i ? "rotate-180" : ""}`}
                                />
                            </button>
                            {openIndex === i && (
                                <div className="px-6 pb-5 text-sm leading-relaxed text-slate-500 dark:text-slate-400 border-t border-stone-200 dark:border-slate-800 pt-4">
                                    {faq.a}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
