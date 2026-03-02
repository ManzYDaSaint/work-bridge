"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const NoteSchema = z.string().min(1, "Note cannot be empty").max(1000);

export async function addNote(formData: FormData) {
    const noteContent = formData.get("note") as string;

    // Zod Validation
    const validated = NoteSchema.safeParse(noteContent);
    if (!validated.success) {
        return { error: validated.error.issues[0].message };
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    const { error } = await supabase.from("notes").insert([
        {
            content: validated.data,
            user_id: user.id
        }
    ]);

    if (error) {
        console.error("Error adding note:", error);
        return { error: error.message };
    }

    revalidatePath("/dashboard");
    return { success: true };
}

export async function deleteNote(id: string) {
    if (!id) return { error: "ID required" };

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    const { error } = await supabase
        .from("notes")
        .delete()
        .match({ id, user_id: user.id });

    if (error) {
        console.error("Error deleting note:", error);
        return { error: error.message };
    }

    revalidatePath("/dashboard");
    return { success: true };
}

