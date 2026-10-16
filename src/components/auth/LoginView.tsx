import React, { useState } from 'react';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
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
    <div className="min-h-screen bg-[#F8F3F0] flex items-center justify-center p-4 relative selection:bg-[#071952] selection:text-white">
      <div className="w-full max-w-md relative z-10">
        {/* Card Container */}
        <div className="rounded-3xl border border-[#071952]/25 bg-[#F8F3F0] shadow-xl p-8 sm:p-10 space-y-7">
          {/* Logo & Brand Header */}
          <div className="text-center space-y-3">
            <div className="flex justify-center mb-1">
              <img
                src="/stylefleet-logo-black.png"
                alt="StyleFleet Salon Management App"
                className="h-12 w-auto object-contain"
              />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-[#071952]/10 text-[#071952] border border-[#071952]/20 mb-2">
                <span>StyleFleet CRM</span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-black">
                Sign in to CRM
              </h1>
              <p className="text-xs text-black/60 mt-1">
                Secure access for Super Admin and Salon Operations console.
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-xl border border-[#071952]/30 bg-[#071952]/10 text-black text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#071952]" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-black/80 tracking-wide">
                Username or Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-black/40" />
                <input
                  type="email"
                  required
                  autoComplete="off"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@stylefleet.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#071952]/20 bg-[#F8F3F0] text-black text-xs font-medium placeholder:text-black/40 focus:outline-none focus:border-[#071952] focus:ring-1 focus:ring-[#071952] transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-black/80 tracking-wide">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-black/40" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-[#071952]/20 bg-[#F8F3F0] text-black text-xs font-medium placeholder:text-black/40 focus:outline-none focus:border-[#071952] focus:ring-1 focus:ring-[#071952] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-black/40 hover:text-black transition-colors p-1 cursor-pointer"
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
              className="w-full py-3 px-4 rounded-xl text-xs font-extrabold uppercase tracking-wider bg-[#071952] text-white hover:bg-[#0b2575] shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Footer Security Badges */}
          <div className="pt-4 border-t border-[#071952]/15 flex flex-col items-center gap-2 text-center text-[11px] text-black/60">
            <div className="flex items-center gap-1.5 text-black font-bold font-mono">
              <span className="w-2 h-2 rounded-full bg-[#071952] animate-pulse" />
              <span>Database Connection: Live</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-[11px] text-black/60 flex-wrap">
              <span>Super Admin Portal</span>
              <span>•</span>
              <button
                type="button"
                onClick={onOpenPrivacyPolicy}
                className="text-[#071952] hover:underline cursor-pointer font-bold transition-colors"
              >
                Privacy Policy
              </button>
              {onOpenDeleteAccount && (
                <>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={onOpenDeleteAccount}
                    className="text-black/70 hover:text-[#071952] underline cursor-pointer font-medium transition-colors"
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
