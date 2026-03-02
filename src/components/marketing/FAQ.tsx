"use client";

import { motion } from "framer-motion";

export default function FAQ() {
    const faqs = [
        {
            q: "How does the AI talent matching work?",
            a: "Our AI engine performs semantic analysis on candidate skills, parses certificates, and evaluates work experience against your specific job requirements to generate a 0-100 Match Score.",
        },
        {
            q: "Are the academic qualifications verified?",
            a: "Yes. When a job seeker uploads a certificate, our system parses the document and fuzzily matches the awarded name to the user's verified identity to prevent credential fraud.",
        },
        {
            q: "Why are candidate names hidden initially?",
            a: "We employ Zero-Bias Discovery. When employers view the talent pipeline, real names and photos are redacted until the candidate is explicitly shortlisted, ensuring decisions are based purely on merit.",
        },
        {
            q: "Can I generate custom resumes for matched candidates?",
            a: "Absolutely. Our platform uses Gemini AI to synthesize a candidate's bio, skills, and parsed certificates into a perfectly tailored, ATS-ready resume specifically for your job posting.",
        },
    ];

    return (
        <section id="faq" className="py-32 bg-white dark:bg-[#020617]">
            <div className="max-w-4xl mx-auto px-4 sm:px-6">
                <div className="text-center mb-20">
                    <h2 className="text-3xl md:text-5xl font-black mb-6 tracking-tight">Frequently Asked Questions</h2>
                    <p className="text-lg text-slate-500 max-w-2xl mx-auto">Everything you need to know about getting started with WorkBridge.</p>
                </div>

                <div className="grid gap-6">
                    {faqs.map((faq, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className="collapse collapse-arrow bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/50 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                        >
                            <input type="checkbox" name={`faq-accordion-${i}`} />
                            <div className="collapse-title text-xl font-bold px-8 py-6">
                                {faq.q}
                            </div>
                            <div className="collapse-content px-8 pb-6 text-slate-500 dark:text-slate-400 leading-relaxed">
                                <p>{faq.a}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
