import React, { useState } from 'react';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface LoginViewProps {
  onOpenPrivacyPolicy?: () => void;
  onOpenDeleteAccount?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onOpenPrivacyPolicy,
  onOpenDeleteAccount,
}) => {
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
    }, 250);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4 relative selection:bg-[#D4AF37]/30 selection:text-[#B8860B]">
      {/* Background ambient warm gold glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Card Container */}
        <div className="rounded-3xl border-2 border-[#D4AF37]/35 bg-white shadow-2xl p-8 sm:p-10 space-y-7">
          {/* Logo & Brand Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-black border-2 border-[#D4AF37] p-2 shadow-md">
              <img
                src="/stylefleet-logo.png"
                alt="StyleFleet Logo"
                className="w-full h-full object-contain"
              />
            </div>

            <div>
              <div className="flex items-center justify-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest text-[#B8860B] mb-1">
                <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>HQ Command Center</span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-neutral-900">
                STYLEFLEET ADMIN
              </h1>
              <p className="text-xs text-neutral-500 mt-1">
                Enter your admin credentials to access the monitoring dashboard.
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-xl border border-rose-300 bg-rose-50 text-rose-700 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
            {/* Email Field */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-neutral-700 tracking-wide uppercase">
                Username / Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#D4AF37]" />
                <input
                  type="email"
                  required
                  autoComplete="off"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your admin email"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-neutral-300 bg-white text-neutral-900 text-xs font-medium placeholder:text-neutral-400 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-neutral-700 tracking-wide uppercase">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#D4AF37]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-11 py-3 rounded-xl border border-neutral-300 bg-white text-neutral-900 text-xs font-medium placeholder:text-neutral-400 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 transition-colors p-1 cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !email.trim() || !password.trim()}
              className="w-full py-3.5 px-4 rounded-xl text-xs font-extrabold uppercase tracking-wider bg-gradient-to-r from-[#D4AF37] via-[#E0C068] to-[#C5A059] text-black hover:brightness-105 shadow-md shadow-[#D4AF37]/25 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-black" />
                  <span>Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5 text-black" />
                </>
              )}
            </button>
          </form>

          {/* Footer Security Badges */}
          <div className="pt-4 border-t border-neutral-200 flex flex-col items-center gap-2 text-center text-[11px] text-neutral-500">
            <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Supabase Production Connected</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-[11px] text-neutral-500 flex-wrap">
              <span>Protected Administration Access</span>
              <span>•</span>
              <button
                type="button"
                onClick={onOpenPrivacyPolicy}
                className="text-[#B8860B] hover:underline cursor-pointer font-semibold transition-colors"
              >
                Privacy Policy
              </button>
              {onOpenDeleteAccount && (
                <>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={onOpenDeleteAccount}
                    className="text-neutral-600 hover:text-rose-600 underline cursor-pointer font-medium transition-colors"
                  >
                    Delete Account
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
