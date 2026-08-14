import { z } from "zod";

export const IngestionActionSchema = z.enum(["APPROVE", "REJECT", "UPDATE_AND_APPROVE", "DELETE_QUEUE_ITEM"]);

export const QueueBulkActionSchema = z.enum(["BULK_APPROVE", "BULK_DELETE"]);

export const SourceActionSchema = z.enum(["CREATE_SOURCE", "DELETE_SOURCE", "TOGGLE_SOURCE_STATUS"]);

export const SettingActionSchema = z.object({
    settingKey: z.string(),
    settingValue: z.boolean(),
});
