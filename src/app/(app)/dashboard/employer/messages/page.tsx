"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Search, Loader2, User as UserIcon } from "lucide-react";
import { PageHeader } from "@/components/dashboard/ui";
import ChatWindow from "@/components/dashboard/ChatWindow";
import { Conversation } from "@/types";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { createBrowserSupabaseClient } from "@/lib/supabase-client";

export default function EmployerMessagesPage() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    const supabase = createBrowserSupabaseClient();

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) setCurrentUserId(user.id);

                const res = await apiFetch("/conversations");
                if (res.ok) {
                    const data = await res.json();
                    setConversations(data);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();

        const channel = supabase
            .channel('employer_conversation_updates')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'conversations' },
                () => fetchConversations()
            )
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages' },
                () => fetchConversations()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchConversations = async () => {
        try {
            const res = await apiFetch("/conversations");
            if (res.ok) {
                const data = await res.json();
                setConversations(data);
            }
        } catch { }
    };

    const selectedConversation = conversations.find(c => c.id === selectedId);

    if (loading) return (
        <div className="h-[60vh] flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
    );

    return (
        <div className="h-[calc(100vh-140px)] flex flex-col space-y-6">
            <PageHeader
                title="Communications Hub"
                subtitle="Direct interface with prospective talent"
            />

            <div className="flex-1 flex overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-sm">
                {/* Sidebar */}
                <aside className="w-full md:w-80 border-r border-slate-100 dark:border-slate-800 flex flex-col bg-slate-50/30 dark:bg-slate-900/50 backdrop-blur-xl">
                    <div className="p-6">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={16} />
                            <input
                                type="text"
                                placeholder="Filter Candidates..."
                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-3 pl-10 pr-4 text-xs font-bold outline-none ring-blue-500/10 focus:ring-4 transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-3 space-y-1">
                        {conversations.length === 0 ? (
                            <div className="p-10 text-center space-y-4 opacity-40 grayscale">
                                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto">
                                    <MessageSquare size={24} />
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-widest">No active links</p>
                            </div>
                        ) : (
                            conversations.map((conv) => (
                                <button
                                    key={conv.id}
                                    onClick={() => setSelectedId(conv.id)}
                                    className={cn(
                                        "w-full p-4 rounded-3xl flex items-center gap-4 transition-all hover:bg-white dark:hover:bg-slate-800",
                                        selectedId === conv.id ? "bg-white dark:bg-slate-800 shadow-md ring-1 ring-slate-100 dark:ring-slate-700" : "opacity-70 hover:opacity-100"
                                    )}
                                >
                                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center text-slate-400 flex-shrink-0">
                                        <UserIcon size={20} />
                                    </div>
                                    <div className="flex-1 min-w-0 text-left">
                                        <div className="flex justify-between items-start">
                                            <p className="font-black text-slate-900 dark:text-white truncate text-sm">
                                                {conv.seeker?.fullName || "Candidate"}
                                            </p>
                                            {(conv.unreadCount ?? 0) > 0 && (
                                                <div className="w-5 h-5 bg-blue-600 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30">
                                                    {conv.unreadCount}
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500 font-bold truncate mt-0.5 italic">
                                            {conv.lastMessage || "Link established..."}
                                        </p>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </aside>

                {/* Chat Area */}
                <main className="flex-1 hidden md:block">
                    <AnimatePresence mode="wait">
                        {selectedConversation && currentUserId ? (
                            <motion.div
                                key={selectedConversation.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="h-full"
                            >
                                <ChatWindow
                                    conversation={selectedConversation}
                                    currentUserId={currentUserId}
                                />
                            </motion.div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-12 opacity-20 grayscale">
                                <motion.div
                                    animate={{ rotate: [0, 10, -10, 0] }}
                                    transition={{ duration: 4, repeat: Infinity }}
                                >
                                    <MessageSquare size={80} strokeWidth={1} />
                                </motion.div>
                                <p className="mt-8 font-black uppercase tracking-[0.3em] text-2xl">Awaiting Frequency</p>
                                <p className="max-w-xs text-sm font-bold mt-2">Pick a transmission thread from the left rail to resume link.</p>
                            </div>
                        )}
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
}
