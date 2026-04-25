"use client";

import { motion } from "framer-motion";

const companies = [
    "BancABC Malawi",
    "TNM",
    "Airtel Malawi",
    "National Bank",
    "Press Corporation",
    "Malawi Revenue",
    "Standard Bank",
    "FDH Bank",
    "Sunbird Hotels",
    "MASM",
];

export default function LogoMarquee() {
    return (
        <div
            className="w-full h-16 relative flex items-center overflow-hidden"
            style={{
                maskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
                WebkitMaskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)"
            }}
        >
            <motion.div
                animate={{ x: ["0%", "-50%"] }}
                transition={{
                    duration: 35,
                    repeat: Infinity,
                    ease: "linear",
                }}
                className="flex gap-12 items-center px-12 whitespace-nowrap"
            >
                {/* Double for seamless loop */}
                {[...companies, ...companies].map((company, i) => (
                    <span
                        key={i}
                        className="text-lg font-bold text-slate-600 dark:text-slate-600 cursor-default"
                    >
                        {company}
                    </span>
                ))}
            </motion.div>
        </div>
    );
}
