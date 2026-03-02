"use client";

import { motion } from "framer-motion";

const companies = [
    "Google",
    "Microsoft",
    "Meta",
    "Amazon",
    "Apple",
    "Netflix",
    "Airbnb",
    "Spotify",
];

export default function LogoMarquee() {
    return (
        <div className="w-full h-24 relative flex items-center overflow-hidden bg-white/5 border-y border-white/10 backdrop-blur-sm">
            <div className="absolute left-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-r from-[#020617] to-transparent" />
            <div className="absolute right-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-l from-[#020617] to-transparent" />

            <motion.div
                animate={{ x: ["0%", "-50%"] }}
                transition={{
                    duration: 30,
                    repeat: Infinity,
                    ease: "linear",
                }}
                className="flex gap-16 items-center px-12"
            >
                {/* Double interpolation for seamless loop */}
                {[...companies, ...companies].map((company, i) => (
                    <div
                        key={i}
                        className="text-2xl font-black text-slate-500 hover:text-white transition-colors cursor-default whitespace-nowrap"
                    >
                        {company}
                    </div>
                ))}
            </motion.div>
        </div>
    );
}
