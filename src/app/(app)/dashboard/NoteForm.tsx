"use client";

import { useRef } from "react";
import { addNote } from "./actions";
import { toast } from "sonner";

export default function NoteForm() {
    const formRef = useRef<HTMLFormElement>(null);

    async function clientAction(formData: FormData) {
        const result = await addNote(formData);

        if (result?.error) {
            toast.error(result.error);
        } else {
            toast.success("Note added successfully!");
            formRef.current?.reset();
        }
    }

    return (
        <form ref={formRef} action={clientAction} className="flex gap-2 mb-8">
            <input
                type="text"
                name="note"
                placeholder="Build something awesome today..."
                className="input input-bordered flex-grow"
                required
            />
            <button type="submit" className="btn btn-primary">Add Note</button>
        </form>
    );
}
