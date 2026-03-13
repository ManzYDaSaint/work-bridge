import { PageHeader, SectionCard, Card, Badge } from "@/components/dashboard/ui";
import { Lightbulb, Target, Rocket, Briefcase, Award } from "lucide-react";
import Link from "next/link";

const TIPS = [
    {
        title: "Focus on Achievements, Not Just Duties",
        desc: "Instead of saying 'Responsible for sales', say 'Increased sales by 25% over 6 months through targeted outreach'. Use numbers to quantify your impact.",
        icon: Target,
        badge: "Most Important"
    },
    {
        title: "Keyword Optimization for AI",
        desc: "WorkBridge uses AI to match you with jobs. Ensure your skills and bio use common industry terms that employers search for.",
        icon: Rocket,
        badge: "AI Ready"
    },
    {
        title: "Quantify Your Skills",
        desc: "Don't just list 'Python'. Mention the complexity and scale of projects you've built. Volume and frequency matter.",
        icon: Briefcase
    },
    {
        title: "Keep it Clean and Concise",
        desc: "Employers spend seconds on a first pass. Use bullet points, clear headings, and avoid large walls of text.",
        icon: Lightbulb
    }
];

export default function ResumeTipsPage() {
    return (
        <div className="space-y-8 max-w-4xl">
            <PageHeader
                title="Resume Writing Tips"
                subtitle="Master the art of presentation. Use these tips to build a profile that AI matches and humans love."
            />

            <div className="grid gap-6">
                {TIPS.map((tip, i) => (
                    <Card key={i} className="p-8 group hover:border-blue-300 transition-all">
                        <div className="flex items-start gap-6">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                <tip.icon size={24} />
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-lg font-black text-slate-900 tracking-tight">{tip.title}</h3>
                                    {tip.badge && <Badge label={tip.badge} variant="blue" />}
                                </div>
                                <p className="text-slate-500 leading-relaxed">
                                    {tip.desc}
                                </p>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            <SectionCard title="Common Mistakes to Avoid">
                <div className="p-6 space-y-4">
                    <div className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-red-400 mt-2 shrink-0" />
                        <p className="text-sm text-slate-600"><span className="font-bold text-slate-900">Grammar and spelling:</span> Even one error can signal a lack of attention to detail.</p>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-red-400 mt-2 shrink-0" />
                        <p className="text-sm text-slate-600"><span className="font-bold text-slate-900">Generic summaries:</span> Tailor your bio to clearly state what value you bring to a team.</p>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-red-400 mt-2 shrink-0" />
                        <p className="text-sm text-slate-600"><span className="font-bold text-slate-900">Outdated contact info:</span> Ensure your email alias and location are current.</p>
                    </div>
                </div>
            </SectionCard>

            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-2xl shadow-blue-600/20">
                <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                        <Award size={28} />
                    </div>
                    <h3 className="text-xl font-black tracking-tight">Ready to stand out?</h3>
                </div>
                <p className="text-blue-100 mb-6 leading-relaxed max-w-2xl">
                    Apply these tips to your profile and resume now. Users with detailed, quantified achievements see a 300% increase in employer reveal requests.
                </p>
                <Link
                    href="/dashboard/seeker/profile"
                    className="inline-flex h-12 px-8 items-center justify-center bg-white text-blue-600 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-50 transition-all shadow-xl active:scale-95"
                >
                    Update My Profile
                </Link>
            </div>
        </div>
    );
}
