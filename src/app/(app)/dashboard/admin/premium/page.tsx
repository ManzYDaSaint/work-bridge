import PremiumDashboardClient from "./PremiumDashboardClient";

export const metadata = {
    title: "Premium Subscriptions | Admin Dashboard",
    description: "Monitor and manage all Aganyu Premium job seeker memberships."
};

export default function PremiumDashboardPage() {
    return <PremiumDashboardClient />;
}

export const dynamic = "force-dynamic";
