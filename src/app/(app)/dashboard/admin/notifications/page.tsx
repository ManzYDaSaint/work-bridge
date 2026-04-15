import { Bell } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/dashboard/ui";

export default function AdminNotificationsPage() {
    return (
        <div className="space-y-6">
            <PageHeader title="System Notifications" subtitle="Alerts and platform-wide announcements" />
            <div className="bg-white rounded-2xl border border-slate-200">
                <EmptyState
                    icon={Bell}
                    title="No System Notifications"
                    description="Platform alerts, admin warnings, and system events will appear here."
                    iconColor="text-blue-500"
                />
            </div>
        </div>
    );
}
