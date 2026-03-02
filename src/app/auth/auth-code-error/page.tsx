import Link from "next/link";

export default function AuthErrorPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
            <h1 className="text-4xl font-bold">Authentication Error</h1>
            <p className="text-xl opacity-70">There was a problem signing you in.</p>
            <Link href="/login" className="btn btn-primary">
                Try Again
            </Link>
        </div>
    );
}
