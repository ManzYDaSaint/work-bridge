"use client";

import { PageHeader } from "@/components/dashboard/ui";
import SeekerJobBoard from "@/components/jobs/SeekerJobBoard";

export default function SeekerJobsPage() {
    return (
        <div className="space-y-8">
            <PageHeader
                title="Find Opportunities"
                subtitle="Explore roles that match your verified credentials and elite talent status."
            />

            <SeekerJobBoard />
        </div>
    );
}
