"use client";

import { useState, useEffect, useRef } from "react";
import { Message, Conversation, JobSeeker, Employer } from "@/types";
import { createBrowserSupabaseClient } from "@/lib/supabase-client";
import { apiFetch, apiFetchJson } from "@/lib/api";
import { Send, Loader2, User as UserIcon, Building } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface ChatWindowProps {
    conversation: Conversation;
    currentUserId: string;
}

export default function ChatWindow({ conversation, currentUserId }: ChatWindowProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const supabase = createBrowserSupabaseClient();

    const otherUser = conversation.employerId === currentUserId ? conversation.seeker : conversation.employer;
    const otherUserName = conversation.employerId === currentUserId
        ? (conversation.seeker?.fullName || "Job Seeker")
        : (conversation.employer?.companyName || "Employer");

    useEffect(() => {
        const fetchMessages = async () => {
            try {
                const res = await apiFetch(`/messages?conversationId=${conversation.id}`);
                if (res.ok) {
                    const data = await res.json();
                    setMessages(data);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchMessages();
        markAsRead();

        // Subscribe to real-time messages for this conversation
        const channel = supabase
            .channel(`chat_${conversation.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `conversation_id=eq.${conversation.id}`
                },
                (payload) => {
                    const msg = {
                        id: payload.new.id,
                        conversationId: payload.new.conversation_id,
                        senderId: payload.new.sender_id,
                        content: payload.new.content,
                        isRead: payload.new.is_read,
                        createdAt: payload.new.created_at
                    } as Message;

                    setMessages(prev => {
                        // Avoid duplicates if we optimistically added it
                        if (prev.find(m => m.id === msg.id)) return prev;
                        return [...prev, msg];
                    });

                    if (msg.senderId !== currentUserId) {
                        markAsRead();
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [conversation.id]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const markAsRead = async () => {
        try {
            await apiFetchJson("/messages", {
                method: "PATCH",
                body: JSON.stringify({ conversationId: conversation.id })
            });
        } catch { }
    };

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newMessage.trim() || sending) return;

        const content = newMessage;
        setNewMessage("");
        setSending(true);

        try {
            const res = await apiFetchJson("/messages", {
                method: "POST",
                body: JSON.stringify({
                    conversationId: conversation.id,
                    content
                })
            });

            if (res.ok) {
                const msg = await res.json();
                setMessages(prev => {
                    if (prev.find(m => m.id === msg.id)) return prev;
                    return [...prev, msg];
                });
            }
        } finally {
            setSending(false);
        }
    };

    if (loading) return (
        <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800">
            {/* Header */}
            <header className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white/50 dark:bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400">
                        {conversation.employerId === currentUserId ? <UserIcon size={24} /> : <Building size={24} />}
                    </div>
                    <div>
                        <h3 className="font-black text-slate-900 dark:text-white leading-tight">{otherUserName}</h3>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Active Pipeline</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Messages Area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
            >
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-30 grayscale p-8">
                        <motion.div
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4"
                        >
                            <Send size={32} className="-rotate-12" />
                        </motion.div>
                        <p className="font-black uppercase tracking-tighter text-xl">Initiate Transmission</p>
                        <p className="text-sm font-bold max-w-[200px]">Send a message to start the conversation.</p>
                    </div>
                )}
                {messages.map((m, idx) => {
                    const isOwn = m.senderId === currentUserId;
                    return (
                        <motion.div
                            key={m.id}
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            className={cn(
                                "flex flex-col max-w-[80%]",
                                isOwn ? "ml-auto items-end" : "mr-auto items-start"
                            )}
                        >
                            <div className={cn(
                                "p-4 rounded-3xl font-bold text-sm leading-relaxed shadow-sm",
                                isOwn
                                    ? "bg-blue-600 text-white rounded-br-none"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-bl-none"
                            )}>
                                {m.content}
                            </div>
                            <span className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-400 opacity-60">
                                {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </motion.div>
                    );
                })}
            </div>

            {/* Input Area */}
            <footer className="p-6 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 backdrop-blur-xl">
                <form
                    onSubmit={handleSend}
                    className="relative flex items-center gap-4 px-6 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-xl shadow-blue-500/5 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all"
                >
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Sync message..."
                        className="flex-1 bg-transparent outline-none font-bold text-slate-900 dark:text-white placeholder:text-slate-300"
                        disabled={sending}
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim() || sending}
                        className="w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl flex items-center justify-center transition-all disabled:opacity-50 active:scale-90 shadow-lg shadow-blue-500/30"
                    >
                        {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send size={20} className="-rotate-12" />}
                    </button>
                </form>
            </footer>
        </div>
    );
}
