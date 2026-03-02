import { HelpCircle, BookOpen, MessageSquare, FileText, ExternalLink } from "lucide-react";
import { PageHeader, SectionCard, Card } from "@/components/dashboard/ui";
import Link from "next/link";

const FAQ = [
    { q: "How do I apply for a job?", a: "Browse job listings on your Dashboard, click on a job to view details, then hit 'Apply Now'. Your resume and profile will be submitted to the employer." },
    { q: "Can I edit my resume after uploading?", a: "Yes! Head to the Resume page where you can upload a new resume to replace the existing one at any time." },
    { q: "How does the job matching work?", a: "Our algorithm matches job listings to your profile skills, experience level, and employment preferences. The more complete your profile, the better the matches." },
    { q: "How do I withdraw an application?", a: "Go to Applied Jobs, find the application, and click the options menu (···) to withdraw it before the employer reviews it." },
    { q: "What is the Premium plan?", a: "Premium members get priority profile placement, advanced analytics on their applications, and early access to new job offers." },
];

const RESOURCES = [
    { icon: BookOpen, label: "Getting Started Guide", desc: "Learn the basics of using WorkBridge", href: "#" },
    { icon: FileText, label: "Resume Writing Tips", desc: "Best practices for a standout resume", href: "/dashboard/seeker/resume" },
    { icon: MessageSquare, label: "Contact Support", desc: "Chat with our support team", href: "#" },
];

export default function HelpPage() {
    return (
        <div className="space-y-6">
            <PageHeader title="Help & Support" subtitle="Everything you need to get the most out of WorkBridge" />

            {/* Quick Resources */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {RESOURCES.map((r) => (
                    <Link key={r.label} href={r.href} className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-blue-300 hover:shadow-md transition-all group flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                            <r.icon size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900 flex items-center gap-1">
                                {r.label}
                                <ExternalLink size={11} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">{r.desc}</p>
                        </div>
                    </Link>
                ))}
            </div>

            {/* FAQ */}
            <SectionCard title="Frequently Asked Questions">
                <div className="divide-y divide-slate-100">
                    {FAQ.map((item, i) => (
                        <details key={i} className="group px-6 py-4 cursor-pointer">
                            <summary className="flex items-center justify-between text-sm font-bold text-slate-800 list-none">
                                {item.q}
                                <HelpCircle size={16} className="text-slate-400 group-open:text-blue-600 transition-colors flex-shrink-0 ml-3" />
                            </summary>
                            <p className="text-sm text-slate-500 mt-3 leading-relaxed">{item.a}</p>
                        </details>
                    ))}
                </div>
            </SectionCard>
        </div>
    );
}
