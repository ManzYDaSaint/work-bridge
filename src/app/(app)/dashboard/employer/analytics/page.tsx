import { BarChart3, TrendingUp, Eye, Users, Briefcase } from "lucide-react";
import { PageHeader, StatCard, SectionCard } from "@/components/dashboard/ui";

export default function AnalyticsPage() {
    const stats = [
        { label: "Total Job Views", value: 0, icon: Eye, iconBg: "bg-blue-50", iconColor: "text-blue-500" },
        { label: "Total Applicants", value: 0, icon: Users, iconBg: "bg-green-50", iconColor: "text-green-500" },
        { label: "Active Posts", value: 0, icon: Briefcase, iconBg: "bg-orange-50", iconColor: "text-orange-500" },
        { label: "Conversion Rate", value: "0%", icon: TrendingUp, iconBg: "bg-purple-50", iconColor: "text-purple-500" },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Analytics"
                subtitle="Insights into your hiring performance"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {stats.map((s) => <StatCard key={s.label} {...s} />)}
            </div>

            <SectionCard title="Application Trends">
                <div className="py-16 flex flex-col items-center gap-2 text-center px-6">
                    <BarChart3 size={40} className="text-slate-300" />
                    <p className="text-sm font-bold text-slate-600 mt-2">No data available yet</p>
                    <p className="text-xs text-slate-400">Post your first jobs to start generating analytics data.</p>
                </div>
            </SectionCard>
        </div>
    );
}
