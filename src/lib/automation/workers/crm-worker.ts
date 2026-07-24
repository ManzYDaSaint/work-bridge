import { registerPlugin } from "../registry";
import { CRMService } from "@/lib/crm/crm-service";

export const CRMWorker = {
    id: 'crm-manager',
    run: async (payload: any) => {
        const { eventType, employerId } = payload;
        if (!employerId) return;

        switch (eventType) {
            case 'EMPLOYER_REGISTERED':
                await CRMService.updateScore(employerId, 0);
                break;
            case 'JOB_POSTED':
                await CRMService.updateScore(employerId, 30);
                break;
            // Handle other events...
        }
    }
};

registerPlugin(CRMWorker);
