import MatchAnalyticsClient from "../../premium-hub/PremiumHubClient";

export const metadata = {
    title: "Match Analytics & Insights | AI Matching Engine",
    description: "Deep dive into match quality distributions, job embedding health, WhatsApp template status, and system thresholds."
};

export default function MatchAnalyticsPage() {
    return <MatchAnalyticsClient />;
}

export const dynamic = "force-dynamic";
