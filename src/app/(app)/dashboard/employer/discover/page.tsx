import { requireDashboardProfile } from "@/lib/dashboard-auth";
import { jobService } from "@/services/jobService";
import DiscoverTalentClient from "../DiscoverTalentClient";

export default async function DiscoverTalentPage({
    searchParams,
}: {
    searchParams: Promise<{
        intent?: string;
        seniority?: string;
        status?: string;
        location?: string;
        qualification?: string;
        hasResume?: string;
        skills?: string;
        page?: string;
    }>;
}) {
    const { profile: user } = await requireDashboardProfile("EMPLOYER");
    const params = await searchParams;
    const page = parseInt(params.page || "1");

    const filters = {
        intent: params.intent,
        seniority: params.seniority,
        status: params.status,
        location: params.location,
        qualification: params.qualification,
        hasResume: params.hasResume === "true",
        skills: params.skills,
    };

    const { seekers } = await jobService.getDiscoverTalent(user.id, filters, page);

    return (
        <DiscoverTalentClient 
            initialSeekers={seekers}
            appliedSeekerIds={[]}
        />
    );
}
