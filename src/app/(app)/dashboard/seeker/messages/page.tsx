import { MessageSquare } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/dashboard/ui";

export default function MessagesPage() {
    return (
        <div className="space-y-6">
            <PageHeader
                title="Messages"
                subtitle="Conversations with employers and recruiters"
            />
            <div className="bg-white rounded-2xl border border-slate-200">
                <EmptyState
                    icon={MessageSquare}
                    title="No Messages Yet"
                    description="When an employer or recruiter messages you, their conversation will appear here."
                    iconColor="text-blue-400"
                />
            </div>
        </div>
    );
}
