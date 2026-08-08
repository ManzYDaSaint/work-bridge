import { requireAuth } from "@/lib/auth-guard";
import IngestionAdminClient from "./IngestionAdminClient";

export const metadata = {
    title: "Job Ingestion Engine | Aganyu Admin",
    description: "Automated scraper, verification queue, and source connector manager.",
};

export default async function IngestionAdminPage() {
    const auth = await requireAuth(['ADMIN']);
    if (!auth.user) return null;

    return <IngestionAdminClient />;
}
