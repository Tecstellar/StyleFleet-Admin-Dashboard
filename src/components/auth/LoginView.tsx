import React, { useState } from 'react';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  Shield,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    setTimeout(() => {
      const res = login(email, password);
      if (!res.success) {
        setError(res.error || 'Invalid credentials');
        setLoading(false);
      }
    }, 350);
  };

  const handleFillDemo = () => {
    setEmail('Stylefleet@tecstellar.com');
    setPassword('Stylefleetadmin@4321');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#161826] flex items-center justify-center p-4 relative overflow-hidden selection:bg-[#D9A441]/30 selection:text-[#F3D78A]">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 right-10 w-80 h-80 bg-[#1E2136] rounded-full blur-2xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Card Container */}
        <div className="rounded-3xl border-2 border-[#D4AF37]/30 bg-[#1E2136]/90 backdrop-blur-xl shadow-2xl p-8 sm:p-10 space-y-8">
          {/* Logo & Brand Header */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-black/50 border-2 border-[#D4AF37]/60 p-2 shadow-lg shadow-black/40">
              <img
                src="/stylefleet-logo.png"
                alt="StyleFleet Logo"
                className="w-full h-full object-contain"
              />
            </div>

            <div>
              <div className="flex items-center justify-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest text-[#D4AF37] mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>HQ Command Center</span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-white">
                STYLEFLEET ADMIN
              </h1>
              <p className="text-xs text-neutral-400 mt-1">
                Enter your authorized credentials to access master salon operations.
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-300 text-xs flex items-center gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-neutral-300 tracking-wide uppercase">
                Username / Admin Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Stylefleet@tecstellar.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#2D3154] bg-[#161826] text-white text-xs font-medium placeholder:text-neutral-500 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-neutral-300 tracking-wide uppercase">
                  Master Password
                </label>
                <button
                  type="button"
                  onClick={handleFillDemo}
                  className="text-[11px] text-[#DFB847] hover:underline"
                >
                  Quick Fill
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••••••"
                  className="w-full pl-10 pr-11 py-3 rounded-xl border border-[#2D3154] bg-[#161826] text-white text-xs font-medium placeholder:text-neutral-500 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full py-3.5 px-4 rounded-xl text-xs font-extrabold uppercase tracking-wider bg-gradient-to-r from-[#D4AF37] via-[#E0C068] to-[#C5A059] text-[#161826] hover:brightness-110 shadow-lg shadow-[#D4AF37]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#161826] border-t-transparent rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Sign In to Command Center</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Footer Security Badges */}
          <div className="pt-4 border-t border-[#2D3154] flex flex-col items-center gap-2 text-center text-[11px] text-neutral-400">
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Supabase Production Cluster Connected</span>
            </div>
            <p className="text-[10px] text-neutral-400">
              StyleFleet System v2.4 • Authorized Access Only
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
