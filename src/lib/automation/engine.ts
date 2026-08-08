import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { getPlugin } from "./registry";
import { emitSystemEvent } from "@/lib/mission-control";
import "./workers/crm-worker";
import "./workers/email-worker";
import "./workers/buffer-worker";
import "./workers/opportunity-worker";
import "./workers/ingestion-crawler-worker";
import "./workers/ingestion-parser-worker";
import "./workers/ingestion-publisher-worker";

export async function processQueue() {
    const supabase = getSupabaseAdminClient();
    if (!supabase) return;

    // 1. Fetch pending tasks ordered by priority
    const { data: tasks } = await supabase
        .from('automation_tasks')
        .select('*')
        .eq('status', 'PENDING')
        .lte('run_after', new Date().toISOString())
        .order('created_at', { ascending: true })
        .limit(10);

    if (!tasks || tasks.length === 0) return;

    for (const task of tasks) {
        // 2. Mark as RUNNING
        await supabase
            .from('automation_tasks')
            .update({
                status: 'RUNNING',
                attempts: (task.attempts || 0) + 1,
                started_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', task.id);
        
        // 3. Execute plugin
        const plugin = getPlugin(task.plugin_id);
        if (plugin) {
            try {
                await plugin.run({ ...task.payload, taskId: task.id });
                await supabase
                    .from('automation_tasks')
                    .update({
                        status: 'COMPLETED',
                        completed_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', task.id);
                
                await emitSystemEvent({
                    category: "AUTOMATION",
                    severity: "SUCCESS",
                    event: "TASK_COMPLETED",
                    message: `Automation task completed: ${task.plugin_id}`,
                    metadata: { taskId: task.id, pluginId: task.plugin_id }
                });
            } catch (error: any) {
                await supabase
                    .from('automation_tasks')
                    .update({
                        status: 'FAILED',
                        last_error: error.message,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', task.id);
                
                await emitSystemEvent({
                    category: "AUTOMATION",
                    severity: "WARNING",
                    event: "TASK_FAILED",
                    message: `Automation task failed: ${task.plugin_id}`,
                    metadata: { taskId: task.id, pluginId: task.plugin_id, error: error.message }
                });
            }
        } else {
            await supabase
                .from('automation_tasks')
                .update({
                    status: 'FAILED',
                    last_error: 'Plugin not found',
                    updated_at: new Date().toISOString(),
                })
                .eq('id', task.id);
            
            await emitSystemEvent({
                category: "AUTOMATION",
                severity: "CRITICAL",
                event: "PLUGIN_NOT_FOUND",
                message: `Automation plugin not found: ${task.plugin_id}`,
                metadata: { taskId: task.id, pluginId: task.plugin_id }
            });
        }
    }
}
