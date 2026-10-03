import { registerPlugin } from "../registry";
import { runMatchDispatchAgent } from "@/lib/agents/match-dispatch-agent";
import { emitSystemEvent } from "@/lib/mission-control";

export const MatchDispatchWorker = {
    id: "match-dispatch-agent",
    run: async (payload: any) => {
        const { jobId } = payload;
        if (!jobId) {
            throw new Error("[MatchDispatchWorker] Missing jobId in task payload");
        }

        const summary = await runMatchDispatchAgent({ jobId });

        await emitSystemEvent({
            category: "AUTOMATION",
            severity: summary.errors.length > 0 ? "WARNING" : "SUCCESS",
            event: "TASK_MATCH_DISPATCH_COMPLETED",
            message: `Match dispatch worker finished for job ${jobId}`,
            metadata: summary,
        });

        if (summary.errors.length > 0 && summary.totalEvaluated === 0) {
            throw new Error(summary.errors.join("; "));
        }
    }
};

registerPlugin(MatchDispatchWorker);
