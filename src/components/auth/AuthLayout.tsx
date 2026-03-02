"use client";

import React from 'react';
import { motion } from 'framer-motion';

interface AuthLayoutProps {
    children: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 md:p-12 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <motion.div
                    animate={{
                        scale: [1, 1.1, 1],
                        opacity: [0.3, 0.5, 0.3]
                    }}
                    transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-[-15%] left-[-10%] w-[60%] h-[60%] bg-blue-100 rounded-full blur-[140px]"
                />
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.4, 0.6, 0.4]
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                    className="absolute bottom-[-15%] right-[-10%] w-[60%] h-[60%] bg-indigo-50 rounded-full blur-[140px]"
                />
            </div>

            {/* Content Container */}
            <motion.main
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-md relative z-10"
            >
                {children}
            </motion.main>

            {/* Layout Footer */}
            <motion.footer
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="mt-12 text-center relative z-10"
            >
                <p className="text-slate-400 text-xs mb-6 font-bold uppercase tracking-widest">
                    Empowering <span className="text-slate-900 font-black italic">2 Million+</span> Professionals
                </p>
                <div className="flex -space-x-2.5 justify-center mb-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <motion.div
                            key={i}
                            whileHover={{ y: -5, scale: 1.1, zIndex: 20 }}
                            className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden shadow-lg transition-all cursor-pointer relative z-10"
                        >
                            <img
                                src={`https://i.pravatar.cc/100?img=${i + 20}`}
                                alt="User"
                                className="w-full h-full object-cover"
                            />
                        </motion.div>
                    ))}
                </div>
            </motion.footer>
        </div>
    );
};

export default AuthLayout;
