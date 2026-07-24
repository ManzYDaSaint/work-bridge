import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export type AutomationEvent = {
    type: string;
    payload: any;
    priority?: 'HIGH' | 'MEDIUM' | 'LOW';
};

const EVENT_PLUGIN_MAP: Record<string, string[]> = {
    JOB_POSTED: ["crm-manager"],
    EMPLOYER_REGISTERED: ["crm-manager"],
    EMAIL_REQUESTED: ["email-notifier"],
};

/**
 * Ingests a system event and queues automation tasks based on registered plugins.
 */
export async function emitEvent(event: AutomationEvent) {
    const supabase = getSupabaseAdminClient();
    if (!supabase) throw new Error("Admin client not initialized");

    const pluginIds = EVENT_PLUGIN_MAP[event.type] || [];
    if (pluginIds.length === 0) return;

    const { data: plugins, error: pluginError } = await supabase
        .from('automation_plugins')
        .select('id')
        .eq('enabled', true)
        .in('id', pluginIds);

    if (pluginError) throw pluginError;

    if (!plugins || plugins.length === 0) return;

    const tasks = plugins.map(plugin => ({
        plugin_id: plugin.id,
        payload: {
            ...event.payload,
            eventType: event.type,
        },
        priority: event.priority || 'MEDIUM'
    }));

    const { error: taskError } = await supabase.from('automation_tasks').insert(tasks);
    if (taskError) throw taskError;
}
