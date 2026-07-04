import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { sendPushNotification } from "@/lib/push-notifications";
import { evaluateCandidateMatch } from "@/lib/candidate-match";

export type NotificationType = 
  | "APPLICATION_UPDATE" 
  | "NEW_APPLICATION" 
  | "SYSTEM" 
  | "VERIFICATION_UPDATE" 
  | "PAYMENT_SUCCESS"
  | "REFERRAL_BONUS"
  | "WARNING"
  | "PROFILE_VIEW"
  | "JOB_MATCH"
  | "INVITE_TO_APPLY";

const TYPE_TO_PREFERENCE_MAP: Record<NotificationType, string> = {
  APPLICATION_UPDATE: "application_updates",
  NEW_APPLICATION: "application_updates",
  SYSTEM: "security_alerts",
  VERIFICATION_UPDATE: "security_alerts",
  PAYMENT_SUCCESS: "payment_notifications",
  REFERRAL_BONUS: "payment_notifications",
  WARNING: "security_alerts",
  PROFILE_VIEW: "profile_view_notifications",
  JOB_MATCH: "job_match_notifications",
  INVITE_TO_APPLY: "application_updates",
};

const NOTIFICATION_TEMPLATES: Record<NotificationType, { title: string; message: (vars: any) => string }> = {
  APPLICATION_UPDATE: {
    title: "Application Update",
    message: ({ companyName, jobTitle, status }) => 
      `${companyName} has updated your application for ${jobTitle} to ${status.toLowerCase()}.`,
  },
  NEW_APPLICATION: {
    title: "New Job Application",
    message: ({ candidateName, jobTitle }) => 
      `${candidateName} applied for ${jobTitle}`,
  },
  SYSTEM: {
    title: "System Notification",
    message: ({ text }) => text || "You have a new system update.",
  },
  VERIFICATION_UPDATE: {
    title: "Verification Update",
    message: ({ status, companyName }) => 
      status === 'APPROVED' 
        ? `Congratulations! ${companyName} has been approved. You can now post jobs.` 
        : `Your employer verification for ${companyName} was not successful.`,
  },
  PAYMENT_SUCCESS: {
    title: "Payment Successful",
    message: ({ amount, item }) => `Your payment for ${item} was successful. Amount: ${amount}.`,
  },
  REFERRAL_BONUS: {
    title: "Referral Bonus Earned!",
    message: ({ friendName }) => 
      friendName 
        ? `${friendName} completed their profile. You earned 5 bonus applications!` 
        : `A friend you invited completed their profile. You earned 5 bonus applications!`,
  },
  WARNING: {
    title: "System Warning",
    message: ({ text }) => text || "A warning requires your attention.",
  },
  PROFILE_VIEW: {
    title: "New Profile View",
    message: ({ companyName }) => `${companyName} just viewed your profile!`,
  },
  JOB_MATCH: {
    title: "Great Match Found!",
    message: ({ companyName, jobTitle }) => 
      `${companyName} just posted a ${jobTitle} position that matches your profile perfectly!`,
  },
  INVITE_TO_APPLY: {
    title: "Exclusive Invite",
    message: ({ companyName, jobTitle }) => 
      `${companyName} has personally invited you to apply for the ${jobTitle} role!`,
  },
};

export const NotificationService = {
    async createNotification({
        userId,
        title,
        message,
        type,
        link,
        templateVars,
    }: {
        userId: string;
        title?: string;
        message?: string;
        type: NotificationType;
        link?: string;
        templateVars?: any;
    }) {
        const supabase = getSupabaseAdminClient();
        if (!supabase) {
            console.error("[NOTIFICATION_DEBUG] FAILED: Admin client could not be initialized.");
            return null;
        }

        if (!userId) {
            console.error("[NOTIFICATION_DEBUG] FAILED: Attempted to create notification with empty userId.");
            return null;
        }

        const template = NOTIFICATION_TEMPLATES[type];
        const finalTitle = title || template.title;
        const finalMessage = message || template.message(templateVars || {});

        const { data: userData } = await supabase
            .from("users")
            .select("email_preferences")
            .eq("id", userId)
            .single();

        const preferences = userData?.email_preferences as any || {};
        const preferenceKey = TYPE_TO_PREFERENCE_MAP[type];

        if (preferenceKey && preferences[preferenceKey] === false) {
            console.log(`[NOTIFICATION_DEBUG] SKIPPED: User ${userId} has disabled ${preferenceKey} notifications.`);
            return null;
        }

        const { data, error } = await supabase
            .from("notifications")
            .insert({
                user_id: userId,
                title: finalTitle,
                message: finalMessage,
                type,
                link,
                is_read: false,
            })
            .select()
            .single();

        if (error) {
            console.error(`[NOTIFICATION_DEBUG] DATABASE_ERROR [${error.code}]: ${error.message}`);
            return null;
        }

        sendPushNotification(userId, {
            title: finalTitle,
            body: finalMessage,
            url: link,
            tag: type,
        }).catch((err) => console.warn("[PUSH] Non-critical push failure:", err));

        return data;
    },

    async notifyAdmin({
        title,
        message,
        type,
        link,
    }: {
        title: string;
        message: string;
        type: NotificationType;
        link?: string;
    }) {
        const supabase = getSupabaseAdminClient();
        if (!supabase) return null;

        const { data: admins } = await supabase
            .from("users")
            .select("id")
            .eq("role", "ADMIN");

        if (!admins || admins.length === 0) return null;

        const notifications = admins.map(admin => ({
            user_id: admin.id,
            title,
            message,
            type,
            link,
            is_read: false,
        }));

        const { data, error } = await supabase
            .from("notifications")
            .insert(notifications)
            .select();

        if (error) {
            console.error("Error notifying admins:", error);
            return null;
        }

        return data;
    },

    async triggerMatchNotifications(jobId: string) {
        const supabase = getSupabaseAdminClient();
        if (!supabase) return;

        try {
            const { data: job, error: jobError } = await supabase
                .from("jobs")
                .select(`*, employer:companies(name)`)
                .eq("id", jobId)
                .single();

            if (jobError || !job) return;

            const { data: seekers, error: seekersError } = await supabase
                .from("users")
                .select(`id, role, profile:job_seekers(*)`)
                .eq("role", "JOB_SEEKER");

            if (seekersError || !seekers) return;

            const matchNotifications = seekers.map(async (user) => {
                const profile = Array.isArray(user.profile) ? user.profile[0] : user.profile;
                if (!profile) return;

                const matchResult = evaluateCandidateMatch(
                    {
                        skills: profile.skills,
                        experience: profile.experience,
                        qualification: profile.qualification,
                    },
                    job,
                    {} 
                );

                if (matchResult.score >= 80) {
                    await this.createNotification({
                        userId: user.id,
                        type: "JOB_MATCH",
                        templateVars: {
                            companyName: job.employer?.name || "a company",
                            jobTitle: job.title,
                        },
                        link: `/dashboard/jobs/${job.id}`,
                    });
                }
            });

            await Promise.all(matchNotifications);
        } catch (err) {
            console.error("[MATCH_SERVICE] Unexpected error:", err);
        }
    }
};
