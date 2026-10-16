import React, { useState } from 'react';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
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
    <div
      className="min-h-screen flex items-center justify-center p-4 relative selection:bg-[#071952] selection:text-white"
      style={{
        backgroundColor: '#FAF8F5',
        backgroundImage: 'radial-gradient(circle at 85% 15%, rgba(254, 243, 199, 0.45) 0%, rgba(255, 255, 255, 0) 55%)',
      }}
    >
      <div className="w-full max-w-[420px] relative z-10">
        {/* White Card Container */}
        <div className="bg-white rounded-[28px] border border-slate-100/80 shadow-[0_20px_50px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)] px-8 py-9 sm:px-10 sm:py-10">
          {/* Logo & Brand Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3">
              <img
                src="/stylefleet-icon.png"
                alt="StyleFleet Emblem"
                className="w-10 h-10 object-contain drop-shadow-xs"
              />
              <div className="text-left">
                <span className="text-2xl font-bold tracking-tight text-slate-900 block leading-tight">
                  StyleFleet
                </span>
                <span className="text-[9px] font-bold text-slate-400 tracking-[0.22em] uppercase block mt-0.5">
                  SALON MANAGEMENT APP
                </span>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-5 p-3 rounded-xl border border-red-200/80 bg-red-50 text-red-700 text-xs flex items-center gap-2.5 font-medium animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="block text-[13px] font-semibold text-slate-800">
                Username or Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  required
                  autoComplete="off"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@stylefleet.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm font-normal placeholder:text-slate-400 focus:outline-none focus:border-slate-400 transition-colors shadow-2xs"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="block text-[13px] font-semibold text-slate-800">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm font-normal placeholder:text-slate-400 focus:outline-none focus:border-slate-400 transition-colors shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || !email.trim() || !password.trim()}
                className="w-full py-3.5 px-4 rounded-xl text-[13px] font-bold uppercase tracking-wider text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-slate-300/40 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: '#8C9EB5',
                }}
                onMouseEnter={(e) => {
                  if (!loading && email.trim() && password.trim()) {
                    e.currentTarget.style.backgroundColor = '#7D90A7';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#8C9EB5';
                }}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>SIGNING IN...</span>
                  </>
                ) : (
                  <>
                    <span>SIGN IN</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Footer Links */}
          <div className="mt-7 flex items-center justify-center gap-6 text-xs font-medium text-slate-500">
            {onOpenPrivacyPolicy && (
              <button
                type="button"
                onClick={onOpenPrivacyPolicy}
                className="hover:text-slate-800 transition-colors cursor-pointer"
              >
                Privacy Policy
              </button>
            )}
            {onOpenDeleteAccount && (
              <button
                type="button"
                onClick={onOpenDeleteAccount}
                className="hover:text-slate-800 transition-colors cursor-pointer"
              >
                Delete Account
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
