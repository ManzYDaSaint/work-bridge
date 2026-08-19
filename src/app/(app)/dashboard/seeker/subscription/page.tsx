import { Suspense } from "react";
import SeekerSubscriptionClient from "./SeekerSubscriptionClient";

export const metadata = {
    title: "Aganyu Premium & WhatsApp Alerts | Job Seeker",
    description: "Manage your Aganyu Premium membership and WhatsApp job match alert preferences."
};

export default function SeekerSubscriptionPage() {
    return (
        <Suspense fallback={
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"></div>
            </div>
        }>
            <SeekerSubscriptionClient />
        </Suspense>
    );
}

export const dynamic = "force-dynamic";
