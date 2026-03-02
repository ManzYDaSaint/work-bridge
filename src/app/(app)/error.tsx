"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
            <div className="bg-error/10 p-6 rounded-2xl border border-error/20 max-w-md">
                <h2 className="text-2xl font-bold text-error mb-2">Something went wrong!</h2>
                <p className="opacity-70 mb-6">
                    {error.message || "An unexpected error occurred in the application."}
                </p>
                <div className="flex gap-4 justify-center">
                    <button onClick={() => reset()} className="btn btn-primary">
                        Try again
                    </button>
                    <Link href="/" className="btn btn-ghost">
                        Back to Home
                    </Link>
                </div>
            </div>
        </div>
    );
}
