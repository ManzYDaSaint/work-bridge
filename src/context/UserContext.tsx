"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User } from "@/types";
import { apiFetch } from "@/lib/api";
import { subscribeToAuthSignedIn, subscribeToAuthSignedOut } from "@/lib/auth-utils";

interface UserContextType {
    user: User | null;
    setUser: (user: User | null) => void;
    refreshUser: () => Promise<void>;
    loading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({
    children,
    initialUser,
}: {
    children: React.ReactNode;
    initialUser: User | null;
}) {
    const [user, setUserState] = useState<User | null>(initialUser);
    const [loading, setLoading] = useState(false);
    // Track whether we have ever received a fresh response from /api/me.
    // Once we do, we stop overwriting the context with SSR data — this prevents
    // router.refresh() from re-propagating stale server-rendered values on top
    // of data that was already freshly fetched.
    const hasRefreshedRef = React.useRef(false);

    const setUser = useCallback((newUser: User | null) => {
        setUserState(newUser);
    }, []);

    const refreshUser = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiFetch("/api/me");
            if (res.ok) {
                const data = await res.json();
                hasRefreshedRef.current = true;
                setUserState(data);
            }
        } catch (error) {
            console.error("Failed to refresh user:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Sync the SSR-provided initialUser into state only while we have not yet
    // fetched a fresh copy from /api/me. After the first successful refresh,
    // navigation-triggered re-renders must NOT overwrite the live client state.
    useEffect(() => {
        if (initialUser && !hasRefreshedRef.current) {
            setUserState(initialUser);
        }
    }, [initialUser]);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const unsubscribeSignedOut = subscribeToAuthSignedOut(() => {
            setUserState(null);
        });

        const unsubscribeSignedIn = subscribeToAuthSignedIn(() => {
            refreshUser();
        });

        return () => {
            unsubscribeSignedOut();
            unsubscribeSignedIn();
        };
    }, [refreshUser]);

    return (
        <UserContext.Provider value={{ user, setUser, refreshUser, loading }}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error("useUser must be used within a UserProvider");
    }
    return context;
}

export function useOptionalUser() {
    return useContext(UserContext);
}
