import { redirect } from "next/navigation";

export default function LegacyPremiumHubRedirect() {
    redirect("/dashboard/admin/matching/analytics");
}
