import { registerPlugin } from "../registry";
import * as emailUtils from "@/lib/resend";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { emitSystemEvent } from "@/lib/mission-control";

export const EmailNotificationWorker = {
    id: 'email-notifier',
    run: async (payload: any) => {
        const supabase = getSupabaseAdminClient();
        if (!supabase) throw new Error("Admin client not initialized");

        // 1. Log attempt
        const { data: log, error: logError } = await supabase
            .from('email_logs')
            .insert({
                task_id: payload.taskId,
                recipient_email: payload.to,
                template_id: payload.templateId,
                status: 'QUEUED'
            })
            .select('id')
            .single();

        if (logError) throw logError;

        try {
            // 2. Map templateId to specific sendEmail function
            const { templateId, to, context } = payload;
            let result;

            switch (templateId) {
                case 'WELCOME_EMAIL':
                    result = await emailUtils.sendWelcomeEmail(to, context.name);
                    break;
                case 'NEW_APPLICATION':
                    result = await emailUtils.sendNewApplicationEmail(to, context);
                    break;
                case 'INCOMPLETE_PROFILE':
                    result = await emailUtils.sendIncompleteProfileReminderEmail(to, context);
                    break;
                case 'SEEKER_COME_BACK':
                    result = await emailUtils.sendSeekerComeBackEmail(to, context);
                    break;
                case 'EMPLOYER_COME_BACK':
                    result = await emailUtils.sendEmployerComeBackEmail(to, context);
                    break;
                case 'UPLOAD_RESUME':
                    result = await emailUtils.sendUploadResumeReminderEmail(to, context);
                    break;
                // Add more mappings as needed
                default:
                    throw new Error(`Template not implemented: ${templateId}`);
            }

            if (!result.success) throw result.error;

            await supabase
                .from('email_logs')
                .update({ status: 'SENT', updated_at: new Date().toISOString() })
                .eq('id', log.id);

            await emitSystemEvent({
                category: "NOTIFICATION",
                severity: "SUCCESS",
                event: "EMAIL_SENT",
                message: `Email ${templateId} sent to ${to}`,
                metadata: { templateId, to, taskId: payload.taskId }
            });

        } catch (error: any) {
            // Log Failure and alert Admin
            await supabase
                .from('email_logs')
                .update({ status: 'FAILED', error_message: error.message })
                .eq('id', log?.id);
            
            await supabase
                .from('ai_health_logs')
                .insert({
                    event_type: 'EMAIL_FAILURE',
                    status: 'CRITICAL',
                    message: `Email failed to ${payload.to}: ${error.message}`,
                    metadata: { taskId: payload.taskId }
                });
            await emitSystemEvent({
                category: "NOTIFICATION",
                severity: "CRITICAL",
                event: "EMAIL_FAILED",
                message: `Email ${payload.templateId} failed to ${payload.to}: ${error.message}`,
                metadata: { templateId: payload.templateId, to: payload.to, taskId: payload.taskId }
            });
            throw error;
        }
    }
};

registerPlugin(EmailNotificationWorker);
