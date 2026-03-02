import { Bookmark, BookmarkCheck } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/dashboard/ui";
import Link from "next/link";

export default function SavedJobsPage() {
    return (
        <div className="space-y-6">
            <PageHeader
                title="Saved Jobs"
                subtitle="Jobs you've bookmarked to review later"
            />
            <div className="bg-white rounded-2xl border border-slate-200">
                <EmptyState
                    icon={BookmarkCheck}
                    title="No Saved Jobs Yet"
                    description="Bookmark jobs from the listings to save them here for later review."
                    action={{ label: "Browse Jobs", href: "/dashboard/seeker" }}
                    iconColor="text-yellow-500"
                />
            </div>
        </div>
    );
}
