"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { PageHeader, Badge } from "@/components/dashboard/ui";
import { Users, Search, Mail, MapPin, Calendar, Shield, Loader2, Filter, ShieldAlert, UserCheck, ShieldOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function UserManagementPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState("ALL");

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await apiFetch("/api/admin/users");
                if (res.ok) {
                    setUsers(await res.json());
                }
            } catch (error) {
                toast.error("Security Gateway: Could not sync user directory.");
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, []);

    const handleShield = (email: string) => {
        toast.info(`Shielding ${email}: Permission lockdown initiated.`, {
            description: "Account functionality is being limited temporarily."
        });
    };

    const filteredUsers = users.filter(u => {
        const matchesSearch = u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Decrypting Identities...</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-8 pb-20">
            <PageHeader
                title="User Intelligence"
                subtitle="Directory of all platform participants and their system roles."
            />

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-6 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by name, email, or entity ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full h-14 pl-12 pr-4 bg-white border border-slate-200 rounded-[1.5rem] text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold shadow-sm"
                    />
                </div>
                <div className="flex gap-2 bg-white/80 p-1.5 rounded-[1.5rem] border border-slate-200 shadow-sm backdrop-blur-md shrink-0">
                    {["ALL", "JOB_SEEKER", "EMPLOYER", "ADMIN"].map((role) => (
                        <button
                            key={role}
                            onClick={() => setRoleFilter(role)}
                            className={`px-5 h-11 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${roleFilter === role
                                ? "bg-slate-900 text-white shadow-xl shadow-slate-200"
                                : "text-slate-500 hover:bg-slate-100"
                                }`}
                        >
                            {role.replace("_", " ")}
                        </button>
                    ))}
                </div>
            </div>

            {/* User Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                <AnimatePresence mode="popLayout">
                    {filteredUsers.map((user, idx) => (
                        <motion.div
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ delay: idx * 0.05 }}
                            key={user.id}
                            className="bg-white rounded-[3rem] border border-slate-200 p-10 hover:shadow-2xl hover:shadow-slate-200/50 transition-all group relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/5 blur-2xl -z-10 group-hover:bg-blue-600/10 transition-colors" />

                            <div className="flex items-start justify-between mb-8">
                                <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-xl group-hover:shadow-blue-500/20 transition-all duration-500 shadow-inner">
                                    {user.role === 'ADMIN' ? <ShieldAlert size={32} /> : user.role === 'EMPLOYER' ? <Users size={32} /> : <UserCheck size={32} />}
                                </div>
                                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${user.role === 'ADMIN' ? 'bg-red-50 text-red-600 border-red-100' :
                                    user.role === 'EMPLOYER' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                        'bg-blue-50 text-blue-600 border-blue-100'
                                    }`}>
                                    {user.role.replace("_", " ")}
                                </span>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 leading-tight truncate tracking-tight">{user.name || "Anonymous Entity"}</h3>
                                    <div className="flex items-center gap-2 text-slate-400 mt-2">
                                        <Mail size={12} className="text-blue-500" />
                                        <span className="text-xs font-black truncate">{user.email}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-100">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                            <MapPin size={10} className="text-orange-500" /> Region
                                        </p>
                                        <p className="text-xs font-black text-slate-700 truncate">{user.location || "System Registry"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                            <Calendar size={10} className="text-green-500" /> Tenure
                                        </p>
                                        <p className="text-xs font-black text-slate-700">
                                            {new Date(user.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 pt-8 border-t border-slate-100 flex gap-2">
                                <button className="flex-1 h-12 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2">
                                    Access Details
                                </button>
                                <button
                                    onClick={() => handleShield(user.email)}
                                    className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center hover:text-orange-500 hover:bg-orange-50 transition-all border border-transparent hover:border-orange-100 active:scale-95"
                                >
                                    <ShieldOff size={18} />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {filteredUsers.length === 0 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="py-32 text-center bg-white/50 rounded-[4rem] border border-dashed border-slate-200 backdrop-blur-sm"
                >
                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <Users size={48} className="text-slate-200" />
                    </div>
                    <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[10px]">Registry Empty</p>
                    <p className="text-base text-slate-900 font-bold mt-2">Adjust your parameters to broaden the search.</p>
                </motion.div>
            )}
        </div>
    );
}

