"use client";

import { motion } from "framer-motion";

export default function BackgroundMesh() {
    return (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden h-full w-full">
            {/* Primary animated orb */}
            <motion.div
                animate={{
                    x: ["0%", "20%", "0%"],
                    y: ["0%", "15%", "0%"],
                    scale: [1, 1.2, 1],
                }}
                transition={{
                    duration: 15,
                    repeat: Infinity,
                    ease: "linear",
                }}
                className="absolute -top-[20%] -left-[10%] w-[80%] h-[80%] bg-blue-600/20 rounded-full blur-[120px]"
            />

            {/* Secondary animated orb */}
            <motion.div
                animate={{
                    x: ["0%", "-15%", "0%"],
                    y: ["0%", "20%", "0%"],
                    scale: [1, 1.3, 1],
                }}
                transition={{
                    duration: 18,
                    repeat: Infinity,
                    ease: "linear",
                    delay: 2,
                }}
                className="absolute -bottom-[20%] -right-[10%] w-[70%] h-[70%] bg-indigo-600/15 rounded-full blur-[120px]"
            />

            {/* Tertiary animated orb for detail */}
            <motion.div
                animate={{
                    x: ["10%", "-5%", "10%"],
                    y: ["-10%", "10%", "-10%"],
                    opacity: [0.1, 0.3, 0.1],
                }}
                transition={{
                    duration: 12,
                    repeat: Infinity,
                    ease: "linear",
                    delay: 1,
                }}
                className="absolute top-[20%] left-[30%] w-[40%] h-[40%] bg-sky-400/10 rounded-full blur-[100px]"
            />

            {/* Grid pattern overlay */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-20"></div>
        </div>
    );
}
