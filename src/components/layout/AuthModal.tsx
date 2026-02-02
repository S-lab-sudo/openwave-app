'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, LogIn, Github, Chrome, Loader2, Music2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                toast.success('Welcome back to OpenWave!');
                onClose();
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${window.location.origin}/auth/callback`,
                    }
                });
                if (error) throw error;
                toast.success('Verification email sent! Please check your inbox.');
                onClose();
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOAuth = async (provider: 'github' | 'google') => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                }
            });
            if (error) throw error;
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-md bg-[#0d0d0d] border border-white/5 rounded-[32px] overflow-hidden shadow-2xl"
                    >
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff824d] to-[#ff4100] flex items-center justify-center shadow-lg shadow-orange-950/20">
                                        <Music2 className="w-5 h-5 text-white" fill="currentColor" />
                                    </div>
                                    <h2 className="text-xl font-black text-white tracking-tight">
                                        {isLogin ? 'Welcome Back' : 'Join OpenWave'}
                                    </h2>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-full hover:bg-white/5 text-white/40 hover:text-white transition-all"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-8">
                                <Button
                                    variant="outline"
                                    onClick={() => handleOAuth('google')}
                                    className="h-12 rounded-2xl border-white/5 bg-white/5 hover:bg-white/10 text-white gap-2 font-bold text-xs uppercase tracking-widest"
                                >
                                    <Chrome className="w-4 h-4" />
                                    Google
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => handleOAuth('github')}
                                    className="h-12 rounded-2xl border-white/5 bg-white/5 hover:bg-white/10 text-white gap-2 font-bold text-xs uppercase tracking-widest"
                                >
                                    <Github className="w-4 h-4" />
                                    GitHub
                                </Button>
                            </div>

                            <div className="relative mb-8 text-center">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-white/5" />
                                </div>
                                <span className="relative px-4 bg-[#0d0d0d] text-[10px] font-black text-[#333] uppercase tracking-[0.3em]">
                                    Or email
                                </span>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-[#555] uppercase tracking-[0.2em] ml-2">
                                        Email Address
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#333]" />
                                        <Input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="you@example.com"
                                            className="h-14 pl-12 bg-white/5 border-white/5 rounded-2xl text-white placeholder:text-[#333] focus:ring-[#ff6b35]/20 focus:border-[#ff6b35]/30 transition-all font-bold"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-[#555] uppercase tracking-[0.2em] ml-2">
                                        Password
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#333]" />
                                        <Input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="h-14 pl-12 bg-white/5 border-white/5 rounded-2xl text-white placeholder:text-[#333] focus:ring-[#ff6b35]/20 focus:border-[#ff6b35]/30 transition-all font-bold"
                                            required
                                        />
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full h-14 bg-[#ff6b35] hover:bg-[#ff824d] text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] transition-all shadow-xl shadow-orange-950/20 group"
                                >
                                    {isLoading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            {isLogin ? 'Sign In' : 'Create Account'}
                                            <LogIn className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </Button>
                            </form>

                            <div className="mt-8 text-center">
                                <p className="text-xs text-[#555] font-medium">
                                    {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
                                    <button
                                        onClick={() => setIsLogin(!isLogin)}
                                        className="text-[#ff6b35] font-black hover:text-[#ff824d] transition-colors"
                                    >
                                        {isLogin ? 'Sign Up' : 'Log In'}
                                    </button>
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
