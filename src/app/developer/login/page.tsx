"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSchoolData } from '@/lib/store';
import { authService } from '@/services/authService';
import { Lock, Mail, Loader2, Eye, EyeOff, ShieldCheck, Terminal, Cpu, Zap, ArrowLeft, Globe } from 'lucide-react';

export default function DeveloperLoginPage() {
    const router = useRouter();
    const { setDeveloperProfile, logout } = useSchoolData();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            logout();
            const response = await authService.login({ username: email, password });

            if (response.success) {
                const { user } = await authService.getCurrentUser();
                const attributes = await authService.getUserAttributes();
                const role = attributes['role'];

                if (role === 'Developer') {
                    setDeveloperProfile({
                        id: user!.id,
                        name: attributes['name'] || 'Developer',
                        role: 'Developer'
                    });
                    router.push('/developer');
                } else {
                    alert("Unauthorized: This portal is for Developers only.");
                    await authService.logout();
                }
            } else {
                alert(`Login Failed: ${response.error}`);
            }
        } catch (error) {
            console.error("Developer Login Error:", error);
            alert("An unexpected error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative flex items-center justify-center p-6 bg-[#030712] overflow-hidden selection:bg-blue-500/30">
            {/* Cybernetic Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full">
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #fff 1px, transparent 0)', backgroundSize: '40px 40px' }} />
            </div>

            <div className="w-full max-w-[440px] relative">
                {/* Protocol Header */}
                <div className="flex items-center justify-between mb-8">
                    <button onClick={() => router.push('/')} className="group flex items-center gap-2 text-slate-500 hover:text-white transition-colors">
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-widest italic">Terminate Session</span>
                    </button>
                    <div className="flex gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" />
                        <div className="w-2 h-2 rounded-full bg-slate-800" />
                        <div className="w-2 h-2 rounded-full bg-slate-800" />
                    </div>
                </div>

                {/* Login Container */}
                <div className="bg-[#0b0f1a] border border-white/5 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-blue-400 to-blue-600" />

                    <div className="text-center mb-10">
                        <div className="inline-flex p-4 bg-blue-600/10 text-blue-500 rounded-3xl mb-6 ring-1 ring-blue-500/20">
                            <ShieldCheck size={40} />
                        </div>
                        <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase mb-2">
                            Auth <span className="text-blue-500">Protocol</span>
                        </h1>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic">System Core Gatekeeper</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic ml-1">Identity Token</label>
                            <div className="relative group/field">
                                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within/field:text-blue-500 transition-colors" size={18} />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="DEVELOPER_ID..."
                                    className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-14 pr-6 text-xs text-white placeholder:text-slate-700 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all font-mono"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic ml-1">Pin Hash</label>
                            <div className="relative group/field">
                                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within/field:text-blue-500 transition-colors" size={18} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-14 pr-14 text-xs text-white placeholder:text-slate-700 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all font-mono"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full group relative flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl py-5 text-[11px] font-black uppercase tracking-[0.2em] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-blue-600/20 active:scale-[0.98]"
                        >
                            {isLoading ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                <>
                                    <Terminal size={18} className="group-hover:animate-pulse" />
                                    Initialize Control Sequence
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-12 pt-8 border-t border-white/5 grid grid-cols-2 gap-4">
                        <div className="text-center">
                            <div className="text-[10px] font-black text-slate-600 uppercase mb-1">Node Status</div>
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                <span className="text-[9px] font-black text-white italic">OPERATIONAL</span>
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="text-[10px] font-black text-slate-600 uppercase mb-1">Enc Level</div>
                            <div className="flex items-center justify-center gap-2">
                                <span className="text-[9px] font-black text-blue-500 italic">AES-256-GCM</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Meta */}
                <div className="mt-8 flex items-center justify-center gap-6 opacity-30 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-700">
                    <div className="flex items-center gap-2 text-slate-400">
                        <Globe size={12} />
                        <span className="text-[9px] font-black uppercase tracking-widest">Global CDN</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                        <Cpu size={12} />
                        <span className="text-[9px] font-black uppercase tracking-widest">v1.2.5 LTS</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                        <Zap size={12} />
                        <span className="text-[9px] font-black uppercase tracking-widest">Nitro Build</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
