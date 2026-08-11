import type { SourceHealthStatus } from "./types";

export function computeSourceHealthStatus(consecutiveErrors: number, errorRate: number): SourceHealthStatus {
    if (consecutiveErrors >= 5 || errorRate >= 0.5) {
        return 'DISABLED';
    }
    if (consecutiveErrors >= 3 || errorRate >= 0.25) {
        return 'DEGRADED';
    }
    return 'HEALTHY';
}

export function shouldAutoDisableSource(consecutiveErrors: number, errorRate: number): boolean {
    return consecutiveErrors >= 5 || errorRate >= 0.5;
}
