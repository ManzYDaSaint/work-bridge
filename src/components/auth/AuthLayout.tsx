"use client";

import React from 'react';
import Footer from "@/components/layout/Footer";

interface AuthLayoutProps {
    children: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(148,163,184,0.15),transparent_40%),radial-gradient(circle_at_85%_90%,rgba(148,163,184,0.16),transparent_45%)] dark:bg-[radial-gradient(circle_at_15%_10%,rgba(100,116,139,0.18),transparent_40%),radial-gradient(circle_at_85%_90%,rgba(71,85,105,0.2),transparent_45%)]" />
            </div>

            <main className="flex-1 flex items-center justify-center w-full p-6 md:p-10 relative z-10">
                <div className="w-full max-w-md">
                    {children}
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default AuthLayout;
