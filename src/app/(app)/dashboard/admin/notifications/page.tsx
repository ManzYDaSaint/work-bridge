import { redirect } from "next/navigation";

export default function LegacyNotificationsRedirect() {
    redirect("/dashboard/admin/matching/dispatches");
}
