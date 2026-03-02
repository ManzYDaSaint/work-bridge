import { Facebook, Instagram, Twitter, Linkedin, Github } from 'lucide-react';
import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="relative z-10 w-full bg-white dark:bg-[#020617] border-t border-slate-200 dark:border-slate-800 transition-colors duration-500">
            <div className="max-w-7xl mx-auto px-6 py-20">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
                    <div className="lg:col-span-1 space-y-6">
                        <div className='flex items-center gap-3'>
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/20">W</div>
                            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">WorkBridge</span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed max-w-sm font-medium">
                            The premier professional bridge connecting Malawi&apos;s most ambitious talent with the region&apos;s leading enterprises.
                        </p>
                        <div className="flex gap-4">
                            {[
                                { Icon: Facebook, href: "https://facebook.com/workbridge.mw" },
                                { Icon: Instagram, href: "https://instagram.com/workbridge.mw" },
                                { Icon: Twitter, href: "https://twitter.com/workbridge_mw" },
                                { Icon: Linkedin, href: "https://linkedin.com/company/workbridge-mw" }
                            ].map(({ Icon, href }, i) => (
                                <a
                                    key={i}
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-all hover:scale-110 shadow-sm"
                                >
                                    <Icon size={18} strokeWidth={2.5} />
                                </a>
                            ))}
                        </div>
                    </div>

                    <div className='space-y-6'>
                        <h5 className='text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]'>Mission</h5>
                        <ul className='space-y-4 text-sm font-bold text-slate-600 dark:text-slate-300'>
                            <li><Link href="/about" className="hover:text-blue-600 transition-colors">Our Origin</Link></li>
                            <li><Link href="/impact" className="hover:text-blue-600 transition-colors">Digital Impact</Link></li>
                            <li><Link href="/news" className="hover:text-blue-600 transition-colors">Press Hub</Link></li>
                        </ul>
                    </div>

                    <div className='space-y-6'>
                        <h5 className='text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]'>Expertise</h5>
                        <ul className='space-y-4 text-sm font-bold text-slate-600 dark:text-slate-300'>
                            <li><Link href="/docs" className="hover:text-blue-600 transition-colors">Knowledge Base</Link></li>
                            <li><Link href="/support" className="hover:text-blue-600 transition-colors">Technical Support</Link></li>
                            <li><Link href="/security" className="hover:text-blue-600 transition-colors">Security Ethics</Link></li>
                        </ul>
                    </div>

                    <div className='space-y-6'>
                        <h5 className='text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]'>Platform</h5>
                        <ul className='space-y-4 text-sm font-bold text-slate-600 dark:text-slate-300'>
                            <li><Link href="/pricing" className="hover:text-blue-600 transition-colors">Pricing Architecture</Link></li>
                            <li><Link href="/api" className="hover:text-blue-600 transition-colors">Developer Portal</Link></li>
                            <li><Link href="/status" className="hover:text-blue-600 transition-colors">Pulse Status</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-8 border-t border-slate-100 dark:border-slate-800 text-slate-400 text-[10px] font-black uppercase tracking-[0.1em]">
                    <div className="flex items-center gap-1">
                        <span>&copy; {new Date().getFullYear()}</span>
                        <span className="w-1 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-2" />
                        <span>WorkBridge Group Ltd. Elevating Malawi.</span>
                    </div>
                    <div className="flex items-center gap-8">
                        <Link href="/terms" className="hover:text-slate-900 dark:hover:text-white transition-colors">Terms of Service</Link>
                        <Link href="/privacy" className="hover:text-slate-900 dark:hover:text-white transition-colors">Privacy Pulse</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
