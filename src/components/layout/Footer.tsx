import { Facebook, Instagram, Twitter, Linkedin } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const social = [
    { Icon: Facebook, href: "https://facebook.com/workbridge.mw" },
    { Icon: Instagram, href: "https://instagram.com/workbridge.mw" },
    { Icon: Twitter, href: "https://twitter.com/workbridge_mw" },
    { Icon: Linkedin, href: "https://linkedin.com/company/workbridge-mw" },
];

export default function Footer() {
    return (
        <footer className="relative z-10 w-full border-t border-slate-300 dark:border-slate-800 mt-16">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-14">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-10">
                    <div className="space-y-4 max-w-sm">
                        <div className="flex items-center gap-2.5">
                            <div className="logo-black">
                                <Image src="/logo-black.svg" alt="" width={36} height={36} />
                            </div>
                            <div className="logo-white">
                                <Image src="/logo.svg" alt="" width={36} height={36} />
                            </div>
                            <span className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">WorkBridge</span>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                            A lean, modern job board with Malawi at the center and roles from anywhere work can happen.
                        </p>
                        <div className="flex gap-2">
                            {social.map(({ Icon, href }, i) => (
                                <a
                                    key={i}
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 rounded-lg bg-white/80 dark:bg-slate-800 text-slate-500 hover:text-[#16324f] dark:hover:text-white transition-colors border border-stone-200/70 dark:border-slate-700"
                                    aria-label="Social link"
                                >
                                    <Icon size={16} strokeWidth={2} />
                                </a>
                            ))}
                        </div>
                    </div>

                    <nav className="flex flex-col gap-6 sm:items-end">
                        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-slate-600 dark:text-slate-400">
                            <Link href="/jobs" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                                Jobs
                            </Link>
                            <Link href="/register?role=employer" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                                Post a job
                            </Link>
                            <Link href="/#pricing" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                                Pricing
                            </Link>
                            <Link href="/login" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                                Log in
                            </Link>
                        </div>
                        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-400 dark:text-slate-500">
                            <Link href="/terms" className="hover:text-slate-700 dark:hover:text-slate-300">
                                Terms of Service
                            </Link>
                            <Link href="/privacy" className="hover:text-slate-700 dark:hover:text-slate-300">
                                Privacy Policy
                            </Link>
                        </div>
                    </nav>
                </div>

                <div className="mt-10 pt-8 border-t border-slate-300 dark:border-slate-800 text-center sm:text-left text-xs text-slate-400">
                    &copy; {new Date().getFullYear()} WorkBridge · Built for Malawi, open to remote, hybrid, and on-site work
                </div>
            </div>
        </footer>
    );
}
