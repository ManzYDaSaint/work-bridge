import { redirect } from "next/navigation";
import AIHealthDashboardClient from "./AIHealthDashboardClient";
import { validateAuth } from "@/lib/auth-guard";
import { checkAiServerHealth, performIntegrityScan } from "@/lib/ai-health";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export default async function AIHealthDashboardPage() {
    const auth = await validateAuth(["ADMIN"], false);
    if (auth.error || !auth.user) {
        redirect("/login");
    }

    const supabase = getSupabaseAdminClient();
    const [health, scan] = await Promise.all([
        checkAiServerHealth(),
        performIntegrityScan(),
    ]);

    let tasks: any[] = [];
    let emailLogs: { status: string }[] = [];

    if (supabase) {
        const [tasksResult, emailLogsResult] = await Promise.all([
            supabase
                .from("automation_tasks")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(10),
            supabase
                .from("email_logs")
                .select("status")
                .limit(100),
        ]);

        if (!tasksResult.error) tasks = tasksResult.data || [];
        if (!emailLogsResult.error) emailLogs = emailLogsResult.data || [];
    }

    return (
        <AIHealthDashboardClient
            initialData={{
                health,
                scan,
                automationTasks: {
                    tasks,
                    pendingCount: tasks.filter((task) => task.status === "PENDING").length,
                },
                emailMetrics: {
                    sent: emailLogs.filter((log) => log.status === "SENT").length,
                    failed: emailLogs.filter((log) => log.status === "FAILED").length,
                },
            }}
        />
    );
}
