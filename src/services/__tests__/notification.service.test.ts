import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotificationService } from "../notification.service";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { sendPushNotification } from "@/lib/push-notifications";

// Mock dependencies
vi.mock("@/lib/supabase-admin", () => ({
    getSupabaseAdminClient: vi.fn(),
}));

vi.mock("@/lib/push-notifications", () => ({
    sendPushNotification: vi.fn(),
}));

describe("NotificationService", () => {
    let mockSupabase: any;

    beforeEach(() => {
        vi.clearAllMocks();

        // Create a chainable mock object
        mockSupabase = {
            from: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            single: vi.fn(),
        };

        // Mock sendPushNotification to return a promise to avoid .catch() errors
        (sendPushNotification as any).mockReturnValue(Promise.resolve());

        (getSupabaseAdminClient as any).mockReturnValue(mockSupabase);
    });

    describe("createNotification", () => {
        it("should create a notification when user preferences allow it", async () => {
            // Mock user preferences to allow notifications
            mockSupabase.single.mockResolvedValueOnce({
                data: { email_preferences: { application_updates: true } },
                error: null,
            });

            // Mock the insert operation's terminal select().single()
            mockSupabase.single.mockResolvedValueOnce({
                data: { id: "notif-123", title: "Test Title" },
                error: null,
            });

            const result = await NotificationService.createNotification({
                userId: "user-1",
                type: "APPLICATION_UPDATE",
                templateVars: { companyName: "Aganyu", jobTitle: "Engineer", status: "ACCEPTED" },
            });

            expect(result).toBeDefined();
            expect(mockSupabase.from).toHaveBeenCalledWith("notifications");
            expect(sendPushNotification).toHaveBeenCalled();
        });

        it("should skip notification when user has disabled preferences", async () => {
            // Mock user preferences to DISALLOW notifications
            mockSupabase.single.mockResolvedValueOnce({
                data: { email_preferences: { application_updates: false } },
                error: null,
            });

            const result = await NotificationService.createNotification({
                userId: "user-1",
                type: "APPLICATION_UPDATE",
                templateVars: { companyName: "Aganyu", jobTitle: "Engineer", status: "ACCEPTED" },
            });

            expect(result).toBeNull();
            expect(mockSupabase.from).not.toHaveBeenCalledWith("notifications");
            expect(sendPushNotification).not.toHaveBeenCalled();
        });

        it("should return null if admin client fails to initialize", async () => {
            (getSupabaseAdminClient as any).mockReturnValue(null);

            const result = await NotificationService.createNotification({
                userId: "user-1",
                type: "SYSTEM",
            });

            expect(result).toBeNull();
        });
    });

    describe("notifyAdmin", () => {
        it("should create notifications for all admins", async () => {
            // Mock fetching admins - notifyAdmin uses select().eq() as the terminal call
            mockSupabase.eq.mockResolvedValueOnce({
                data: [{ id: "admin-1" }, { id: "admin-2" }],
                error: null,
            });

            // Mock insert terminal select()
            mockSupabase.select.mockResolvedValueOnce({
                data: [],
                error: null,
            });

            const result = await NotificationService.notifyAdmin({
                title: "Admin Alert",
                message: "Something happened",
                type: "SYSTEM",
            });

            expect(result).toBeDefined();
            expect(mockSupabase.from).toHaveBeenCalledWith("users");
            // Check that we inserted 2 notifications
            const insertCall = mockSupabase.insert.mock.calls[0][0];
            expect(insertCall).toHaveLength(2);
        });
    });
});
