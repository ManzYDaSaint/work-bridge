import MatchAnalyticsClient from "./PremiumHubClient";

export const metadata = {
    title: "Premium Analytics Hub | Admin Dashboard",
    description: "Monitor and manage all Aganyu Premium job seeker analytics."
};

export default function PremiumHubPage() {
    return <MatchAnalyticsClient />;
}

export const dynamic = "force-dynamic";
