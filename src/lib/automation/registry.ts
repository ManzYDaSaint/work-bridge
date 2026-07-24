export interface AutomationPlugin {
    id: string;
    run: (payload: any) => Promise<void>;
}

const registry: Record<string, AutomationPlugin> = {};

export function registerPlugin(plugin: AutomationPlugin) {
    registry[plugin.id] = plugin;
}

export function getPlugin(id: string): AutomationPlugin | undefined {
    return registry[id];
}
