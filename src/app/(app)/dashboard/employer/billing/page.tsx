import { requireDashboardProfile } from "@/lib/dashboard-auth";
import EmployerSubscriptionClient from "./EmployerSubscriptionClient";

export const metadata = {
    title: "Employer Billing & Plans | Aganyu Marketplace",
    description: "Compare Aganyu Free and Pro employer plans, unlock custom talent pools, structured scorecards, and direct candidate outreach."
};

export default async function EmployerBillingPage() {
    const { profile } = await requireDashboardProfile("EMPLOYER");
    return <EmployerSubscriptionClient employer={profile.employer || { plan: profile.plan || 'FREE' }} />;
}

export const dynamic = "force-dynamic";
