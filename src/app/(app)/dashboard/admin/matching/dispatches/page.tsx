import { Suspense } from "react";
import NotificationReviewClient from "../../notifications/NotificationReviewClient";

export const metadata = {
    title: "Dispatched Job Matches Audit | AI Matching Engine",
    description: "Monitor automated instant WhatsApp matches for Premium seekers and 24-hour delayed Email matches for Free seekers."
};

export default function DispatchedMatchesAuditPage() {
    return (
        <Suspense fallback={
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"></div>
            </div>
        }>
            <NotificationReviewClient />
        </Suspense>
    );
}

export const dynamic = "force-dynamic";
