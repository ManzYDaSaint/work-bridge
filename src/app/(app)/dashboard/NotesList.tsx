"use client";

import { deleteNote } from "./actions";
import { toast } from "sonner";

interface Note {
    id: string;
    content: string;
}

export default function NotesList({ notes }: { notes: Note[] }) {
    const handleDelete = async (id: string) => {
        const result = await deleteNote(id);
        if (result?.error) {
            toast.error(result.error);
        } else {
            toast.success("Note deleted");
        }
    };

    return (
        <div className="space-y-4">
            {notes.length === 0 ? (
                <p className="text-base-content/50 italic">No notes yet. Add your first note above!</p>
            ) : (
                notes.map((note) => (
                    <div key={note.id} className="flex justify-between items-center p-4 bg-base-200 rounded-lg group">
                        <p className="flex-grow">{note.content}</p>
                        <button
                            onClick={() => handleDelete(note.id)}
                            className="btn btn-ghost btn-xs text-error opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            Delete
                        </button>
                    </div>
                ))
            )}
        </div>
    );
}
