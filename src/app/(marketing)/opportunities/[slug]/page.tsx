import { getOpportunityBySlug, getPublicOpportunities } from "@/services/opportunityService";
import { notFound } from "next/navigation";
import OpportunityDetailClient from "./OpportunityDetailClient";

export async function generateMetadata({ params }: { params: { slug: string } }) {
    const opp = await getOpportunityBySlug(params.slug);
    if (!opp) return { title: "Opportunity Not Found — Aganyu" };

    return {
        title: `${opp.title} — ${opp.organization_name} | Aganyu`,
        description: opp.short_description,
        openGraph: {
            title: opp.title,
            description: opp.short_description,
            images: opp.organization_logo ? [{ url: opp.organization_logo }] : [],
        },
    };
}

export default async function OpportunityDetailPage({ params }: { params: { slug: string } }) {
    const opp = await getOpportunityBySlug(params.slug);
    if (!opp) notFound();

    const similar = await getPublicOpportunities({ category: opp.category, limit: 3 });
    const filteredSimilar = similar.filter((s: any) => s.id !== opp.id);

    return <OpportunityDetailClient opportunity={opp} similar={filteredSimilar} />;
}
