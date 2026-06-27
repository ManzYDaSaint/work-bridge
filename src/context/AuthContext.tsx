"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { createBrowserSupabaseClient } from "@/lib/supabase-client";
import { dispatchAuthSignedInEvent, dispatchAuthSignedOutEvent } from "@/lib/auth-utils";

interface AuthContextValue {
    user: SupabaseUser | null;
    session: Session | null;
    loading: boolean;
    refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const supabase = useMemo(() => createBrowserSupabaseClient(), []);
    const [user, setUser] = useState<SupabaseUser | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshAuth = useCallback(async () => {
        setLoading(true);
        // Do NOT use Promise.all here! Supabase locks the local storage token.
        // Firing them concurrently causes the "Lock stole it" error.
        const { data: sessionData } = await supabase.auth.getSession();
        const { data: userData } = await supabase.auth.getUser();
        
        setSession(sessionData.session ?? null);
        setUser(userData.user ?? null);
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        let isMounted = true;

        const initialize = async () => {
            const { data: sessionData } = await supabase.auth.getSession();
            const { data: userData } = await supabase.auth.getUser();

            if (!isMounted) return;
            setSession(sessionData.session ?? null);
            setUser(userData.user ?? null);
            setLoading(false);
        };

        initialize().catch(err => {
            console.warn("Auth initialization error (likely benign lock issue):", err);
            if (isMounted) setLoading(false);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, sessionData) => {
            if (!isMounted) return;

            if (event === "SIGNED_OUT" || !sessionData) {
                setSession(null);
                setUser(null);
                dispatchAuthSignedOutEvent();
                return;
            }

            if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
                if (!isMounted) return;
                setSession(sessionData ?? null);
                // Use the user object from the session data instead of making a new network call.
                // Making an async getUser() call here causes a DEADLOCK with updateUser().
                setUser(sessionData?.user ?? null);
                dispatchAuthSignedInEvent();
                return;
            }
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, [supabase]);

    return (
        <AuthContext.Provider value={{ user, session, loading, refreshAuth }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
