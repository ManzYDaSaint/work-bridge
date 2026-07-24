"use client";

import { AlertCircle, Server, Zap } from "lucide-react";
import { Badge, PageHeader, SectionCard, StatCard } from "@/components/dashboard/ui";

type AutomationTask = {
    id: string;
    plugin_id: string;
    status: string;
    priority: string | null;
    created_at: string;
};

type AIHealthData = {
    health: {
        status: string;
        latency: number | null;
        timestamp: string;
    };
    scan: {
        jobsMissingCount: number | null;
        seekersMissingCount: number | null;
    };
    automationTasks: {
        tasks: AutomationTask[];
        pendingCount: number;
    };
    emailMetrics: {
        sent: number;
        failed: number;
    };
};

export default function AIHealthDashboardClient({ initialData }: { initialData: AIHealthData }) {
    const { health, scan, automationTasks, emailMetrics } = initialData;

    return (
        <div className="space-y-6 pb-20">
            <PageHeader
                title="Mission Control"
                subtitle="Monitor AI health and background automation."
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    label="AI Server"
                    value={health.status}
                    icon={Server}
                    iconBg={health.status === "ONLINE" ? "bg-emerald-50" : "bg-rose-50"}
                    iconColor={health.status === "ONLINE" ? "text-emerald-600" : "text-rose-600"}
                />
                <StatCard
                    label="Missing Job Embeddings"
                    value={scan.jobsMissingCount ?? 0}
                    icon={AlertCircle}
                    iconBg="bg-amber-50"
                    iconColor="text-amber-600"
                />
                <StatCard
                    label="Emails Sent"
                    value={emailMetrics.sent}
                    icon={Zap}
                    iconBg="bg-violet-50"
                    iconColor="text-violet-600"
                />
                <StatCard
                    label="Tasks Pending"
                    value={automationTasks.pendingCount}
                    icon={Zap}
                    iconBg="bg-sky-50"
                    iconColor="text-sky-600"
                />
            </div>

            <SectionCard title="Recent Automation Tasks">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase dark:bg-slate-800">
                            <tr>
                                <th className="px-4 py-3">Plugin</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Priority</th>
                                <th className="px-4 py-3">Created</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {automationTasks.tasks.length === 0 ? (
                                <tr>
                                    <td className="px-4 py-6 text-center text-slate-500" colSpan={4}>
                                        No automation tasks found.
                                    </td>
                                </tr>
                            ) : (
                                automationTasks.tasks.map((task) => (
                                    <tr key={task.id}>
                                        <td className="px-4 py-3">{task.plugin_id}</td>
                                        <td className="px-4 py-3"><Badge label={task.status} /></td>
                                        <td className="px-4 py-3">{task.priority || "MEDIUM"}</td>
                                        <td className="px-4 py-3">{new Date(task.created_at).toLocaleDateString()}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </SectionCard>
        </div>
    );
}
