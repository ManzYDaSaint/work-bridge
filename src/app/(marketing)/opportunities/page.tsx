import { getPublicOpportunities } from "@/services/opportunityService";
import PublicOpportunitiesClient from "./PublicOpportunitiesClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
    title: "Scholarships, Grants & Fellowships — Aganyu Opportunities",
    description: "Discover verified scholarships, grants, funding, fellowships, and training programs matched to your career goals.",
};

export default async function PublicOpportunitiesPage() {
    const opportunities = await getPublicOpportunities({ limit: 50 });

    return <PublicOpportunitiesClient initialOpportunities={opportunities} />;
}
