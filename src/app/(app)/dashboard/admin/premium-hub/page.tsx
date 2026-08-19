import PremiumHubClient from "./PremiumHubClient";

export const metadata = {
    title: "Analytics, Templates & Settings | Admin Dashboard",
    description: "Match precision insights, WhatsApp templates, job board health, and system settings."
};

export default function PremiumHubPage() {
    return <PremiumHubClient />;
}

export const dynamic = "force-dynamic";
