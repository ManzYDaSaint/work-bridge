import { PageHeader, SectionCard, Card } from "@/components/dashboard/ui";
import { CheckCircle2, User, FileText, Search, ShieldCheck } from "lucide-react";
import Link from "next/link";

const STEPS = [
    {
        title: "Complete Your Profile",
        desc: "A complete profile is 5x more likely to get noticed. Add your skills, work experience, and location.",
        icon: User,
        link: "/dashboard/seeker/profile",
        action: "Go to Profile"
    },
    {
        title: "Verify Your Credentials",
        desc: "Upload certificates and degrees. Our AI verifies them to boost your Trust Score.",
        icon: ShieldCheck,
        link: "/dashboard/seeker/resume",
        action: "Upload Certs"
    },
    {
        title: "Discover Opportunities",
        desc: "Browse jobs tailored to your skills. Use filters to find the perfect match for your career goals.",
        icon: Search,
        link: "/dashboard/seeker",
        action: "Browse Jobs"
    },
    {
        title: "Track Applications",
        desc: "Monitor your application status in real-time. Stay updated on interviews and offers.",
        icon: FileText,
        link: "/dashboard/seeker/applications",
        action: "View Applications"
    }
];

export default function GetStartedPage() {
    return (
        <div className="space-y-8 max-w-4xl">
            <PageHeader
                title="Getting Started with WorkBridge"
                subtitle="Your journey to a better career starts here. Follow these steps to maximize your success."
            />

            <div className="grid gap-6">
                {STEPS.map((step, i) => (
                    <Card key={i} className="flex flex-col md:flex-row gap-6 items-center md:items-start p-8">
                        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <step.icon size={28} />
                        </div>
                        <div className="flex-1 text-center md:text-left">
                            <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center justify-center md:justify-start gap-2">
                                <span className="text-blue-600/30 text-2xl font-black">{i + 1}.</span>
                                {step.title}
                            </h3>
                            <p className="text-slate-500 mt-2 leading-relaxed">
                                {step.desc}
                            </p>
                            <Link
                                href={step.link}
                                className="inline-flex items-center gap-2 mt-4 text-xs font-black text-blue-600 uppercase tracking-widest hover:gap-3 transition-all"
                            >
                                {step.action} &rarr;
                            </Link>
                        </div>
                    </Card>
                ))}
            </div>

            <SectionCard title="Pro Tip: The AI Advantage">
                <div className="p-6 bg-slate-900 rounded-b-2xl">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl">
                            <CheckCircle2 size={20} />
                        </div>
                        <h4 className="text-sm font-black text-white">Verified Trust</h4>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                        Employers on WorkBridge prioritize <span className="text-blue-400 font-bold">Verified Seekers</span>.
                        By completing your academic verification and skill profile, you bypass traditional screening
                        filters and land directly on hiring managers' shortlists.
                    </p>
                </div>
            </SectionCard>
        </div>
    );
}
