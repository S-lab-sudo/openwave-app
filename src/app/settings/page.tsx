'use client';

import { motion } from 'framer-motion';
import { Settings as SettingsIcon, Bell, Shield, Music, User, HelpCircle, LogOut, ChevronRight } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

export default function SettingsPage() {
    return (
        <div className="container mx-auto px-8 py-8 space-y-10 max-w-4xl">
            <motion.header
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="space-y-2"
            >
                <motion.h1
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1, duration: 0.2 }}
                    className="text-2xl font-black text-white flex items-center gap-2.5"
                >
                    <SettingsIcon className="w-6 h-6 text-[#ff6b35]" />
                    Settings
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.3 }}
                    className="text-[#888888] text-sm font-medium"
                >
                    Manage your account and app preferences.
                </motion.p>
            </motion.header>

            <div className="space-y-8">
                {/* Account Section */}
                <section className="space-y-4">
                    <h2 className="text-base font-black text-white px-2 uppercase tracking-widest text-xs opacity-50">Account</h2>
                    <div className="bg-[#111111] border border-white/5 rounded-3xl overflow-hidden shadow-xl">
                        <div className="p-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors cursor-pointer group">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                                    <User className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <p className="font-bold text-white text-sm">Guest User</p>
                                    <p className="text-[11px] font-medium text-[#555555]">guest_2938475</p>
                                </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-[#333333] group-hover:text-white transition-all" />
                        </div>
                    </div>
                </section>

                {/* Preferences Section */}
                <section className="space-y-4">
                    <h2 className="text-base font-black text-white px-2 uppercase tracking-widest text-xs opacity-50">Playback</h2>
                    <div className="bg-[#111111] border border-white/5 rounded-3xl divide-y divide-white/[0.03] shadow-xl">
                        <div className="p-6 flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                                <Music className="w-4 h-4 text-[#ff6b35]" />
                                <div>
                                    <p className="font-bold text-white text-sm">High-Resolution Audio</p>
                                    <p className="text-[11px] font-medium text-[#555555]">Lossless quality streaming.</p>
                                </div>
                            </div>
                            <Switch defaultChecked className="scale-90" />
                        </div>
                        <div className="p-6 flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                                <Bell className="w-4 h-4 text-[#ff6b35]" />
                                <div>
                                    <p className="font-bold text-white text-sm">Gapless Playback</p>
                                    <p className="text-[11px] font-medium text-[#555555]">Continuous music transition.</p>
                                </div>
                            </div>
                            <Switch defaultChecked className="scale-90" />
                        </div>
                    </div>
                </section>

                {/* Support Section */}
                <section className="space-y-4">
                    <h2 className="text-base font-black text-white px-2 uppercase tracking-widest text-xs opacity-50">Support</h2>
                    <div className="bg-[#111111] border border-white/5 rounded-3xl divide-y divide-white/[0.03] shadow-xl overflow-hidden">
                        <div className="p-5 flex items-center justify-between hover:bg-white/[0.02] transition-colors cursor-pointer group">
                            <div className="flex items-center gap-4">
                                <HelpCircle className="w-4 h-4 text-[#555555] group-hover:text-white transition-colors" />
                                <p className="font-bold text-[#555555] group-hover:text-white text-sm transition-colors">Help Center</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-[#333333] group-hover:text-white transition-all" />
                        </div>
                        <div className="p-5 flex items-center justify-between hover:bg-destructive/10 transition-all cursor-pointer group bg-destructive/[0.01]">
                            <div className="flex items-center gap-4">
                                <LogOut className="w-4 h-4 text-destructive" />
                                <p className="font-bold text-destructive text-sm opacity-80 group-hover:opacity-100">Log Out</p>
                            </div>
                        </div>
                    </div>
                </section>

                <footer className="py-6 text-center">
                    <p className="text-[9px] text-[#333333] font-black tracking-[0.4em] uppercase">OpenWave Build v1.0.4-next-stable</p>
                </footer>
            </div>
        </div>
    );
}
