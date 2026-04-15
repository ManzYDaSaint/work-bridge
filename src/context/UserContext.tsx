"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User } from "@/types";
import { apiFetch } from "@/lib/api";

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

    const setUser = useCallback((newUser: User | null) => {
        setUserState(newUser);
    }, []);

    const refreshUser = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiFetch("/api/me");
            if (res.ok) {
                const data = await res.json();
                setUserState(data);
            }
        } catch (error) {
            console.error("Failed to refresh user:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Also update local state if initialUser changes (e.g. on navigation)
    useEffect(() => {
        if (initialUser) {
            setUserState(initialUser);
        }
    }, [initialUser]);

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
