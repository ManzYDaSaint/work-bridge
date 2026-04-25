import { Sparkles, Search, Bookmark, Send, Shield, Award, BarChart2, Bell } from "lucide-react";

const features = [
    {
        title: "Proactive Talent Discovery",
        description: "Employers don't wait for applications — they search and filter a live pool of candidates by skill, seniority, and search intent.",
        icon: Search,
        accent: "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400",
    },
    {
        title: "Automated Skill Matching",
        description: "Every job listing instantly surfaces candidates whose skills overlap with the role — and seekers see matched jobs right on their dashboard.",
        icon: Sparkles,
        accent: "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400",
    },
    {
        title: "Invite to Apply",
        description: "Employers can send a direct in-platform message to any candidate, inviting them to apply for a specific role — no external contact needed.",
        icon: Send,
        accent: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400",
    },
    {
        title: "Saved Talent Pools",
        description: "Bookmark promising candidates and revisit them anytime from your Saved Talent page — build your own private talent pool.",
        icon: Bookmark,
        accent: "bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400",
    },
    {
        title: "Certifications & Portfolio",
        description: "Seekers can add verified certifications and portfolio links, giving employers a complete picture of their capabilities beyond a CV.",
        icon: Award,
        accent: "bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400",
    },
    {
        title: "Privacy-First Design",
        description: "Candidates control who sees them. Go Public, Anonymous (skills visible, identity hidden), or Hidden to stay off the discovery pool entirely.",
        icon: Shield,
        accent: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    },
    {
        title: "Profile View Analytics",
        description: "Job seekers can see how many times employers have viewed their profile this week — real signal that your profile is working.",
        icon: BarChart2,
        accent: "bg-cyan-50 text-cyan-600 dark:bg-cyan-950/30 dark:text-cyan-400",
    },
    {
        title: "Real-time Notifications",
        description: "Candidates get instant notifications when an employer invites them to apply. Employers are alerted when top-match applications arrive.",
        icon: Bell,
        accent: "bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400",
    },
];

export default function Features() {
    return (
        <section id="features" className="py-24 bg-stone-50 dark:bg-slate-950/60">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <p className="inline-flex items-center rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-stone-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 mb-4">
                        Platform features
                    </p>
                    <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
                        Everything you need to hire — or be hired
                    </h2>
                    <p className="mt-4 text-base text-slate-500 dark:text-slate-400 leading-relaxed">
                        WorkBridge is more than a job board. It is a living talent marketplace where discovery, matching, and hiring happen in one place.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
                    {features.map((f) => {
                        const Icon = f.icon;
                        return (
                            <div
                                key={f.title}
                                className="group rounded-2xl border border-stone-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                            >
                                <div className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl transition-transform group-hover:scale-110 ${f.accent}`}>
                                    <Icon size={20} />
                                </div>
                                <h3 className="mb-3 text-base font-bold text-slate-900 dark:text-white">{f.title}</h3>
                                <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">{f.description}</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
