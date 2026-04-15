import { toast } from "sonner";
import { WifiOff, ShieldAlert, AlertTriangle, CloudOff } from "lucide-react";
import React from "react";

/**
 * Interface for the error toast configuration
 */
interface ToastOptions {
    title?: string;
    description?: string;
}

/**
 * Displays a beautifully styled error toast based on the error type.
 * Detects network issues, rate limits, and common API failures.
 */
export const showErrorToast = (error: any, options: ToastOptions = {}) => {
    const errorMsg = typeof error === 'string' ? error : error?.message || "An unexpected error occurred";

    // 1. Detect Network Failures
    const isNetworkError =
        errorMsg.toLowerCase().includes("fetch") ||
        errorMsg.toLowerCase().includes("network") ||
        errorMsg.toLowerCase().includes("signal");

    if (isNetworkError) {
        return toast.error(
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 font-black text-[10px] uppercase tracking-widest text-red-600">
                    <WifiOff size={14} />
                    Signal Interrupted
                </div>
                <p className="text-xs font-medium text-slate-600">
                    {options.description || "We've lost contact with the bridge. Please check your internet connection."}
                </p>
            </div>
        );
    }

    // 2. Detect Rate Limits
    const isRateLimit =
        errorMsg.toLowerCase().includes("too many requests") ||
        errorMsg.toLowerCase().includes("429");

    if (isRateLimit) {
        return toast.error(
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 font-black text-[10px] uppercase tracking-widest text-amber-600">
                    <AlertTriangle size={14} />
                    Maximum Frequency
                </div>
                <p className="text-xs font-medium text-slate-600">
                    {options.description || "You're moving a bit fast. Please pause for a moment before trying again."}
                </p>
            </div>
        );
    }

    // 3. Detect Auth/Security Failures
    const isSecurityError =
        errorMsg.toLowerCase().includes("unauthorized") ||
        errorMsg.toLowerCase().includes("forbidden") ||
        errorMsg.toLowerCase().includes("invalid credentials") ||
        errorMsg.toLowerCase().includes("password");

    if (isSecurityError) {
        return toast.error(
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 font-black text-[10px] uppercase tracking-widest text-slate-900">
                    <ShieldAlert size={14} />
                    Access Denied
                </div>
                <p className="text-xs font-medium text-slate-600">
                    {options.description || "Authentication failure. Please verify your credentials and try again."}
                </p>
            </div>
        );
    }

    // 4. Default Error Handler
    return toast.error(
        <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 font-black text-[10px] uppercase tracking-widest text-red-500 text-opacity-80">
                <CloudOff size={14} />
                {options.title || "Bridge Alert"}
            </div>
            <p className="text-xs font-medium text-slate-600">
                {errorMsg}
            </p>
        </div>
    );
};
