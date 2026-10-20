import React, { useState, useEffect } from 'react';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
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
  const { login, resendOtp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 2FA OTP verification step for info@tecstellar.com
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let timer: any;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResendSuccess(null);
    setLoading(true);

    try {
      const res = await login(email, password, isOtpStep ? otpCode : undefined);
      setLoading(false);

      if (res.requireOtp) {
        setIsOtpStep(true);
        setCountdown(30);
        if (res.error) {
          setError(res.error);
        }
        return;
      }

      if (!res.success) {
        setError(res.error || 'Invalid credentials');
      }
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || 'Authentication error occurred');
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    setError(null);
    setResendSuccess(null);
    try {
      const res = await resendOtp(email);
      setResendLoading(false);
      if (res.success) {
        setResendSuccess('✓ A fresh OTP code has been dispatched to info@tecstellar.com');
        setCountdown(45);
        setTimeout(() => setResendSuccess(null), 8000);
      } else {
        setError(res.error || 'Failed to resend verification email');
      }
    } catch (err: any) {
      setResendLoading(false);
      setError(err?.message || 'Error resending OTP');
    }
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

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            {!isOtpStep ? (
              <>
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
                      placeholder="info@tecstellar.com"
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
                    className="w-full py-3.5 px-4 rounded-xl text-[13px] font-bold uppercase tracking-wider text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-slate-300/40 disabled:opacity-40 disabled:cursor-not-allowed bg-[#071952] hover:bg-[#0b2575]"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>CHECKING CREDENTIALS...</span>
                      </>
                    ) : (
                      <>
                        <span>CONTINUE</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              /* 2FA OTP STEP */
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-150">
                <div className="p-4 rounded-2xl bg-[#071952]/5 border border-[#071952]/15 text-center space-y-1.5">
                  <div className="w-11 h-11 rounded-full bg-[#071952] text-white flex items-center justify-center mx-auto shadow-sm">
                    <ShieldCheck className="w-5 h-5 text-white" />
                  </div>
                  <h4 className="text-sm font-bold text-[#071952] pt-1">
                    Super Admin Two-Factor Verification
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    A secure 6-digit login OTP has been dispatched to{' '}
                    <strong className="text-slate-900 font-mono font-bold block text-[13px] mt-0.5">
                      info@tecstellar.com
                    </strong>
                  </p>
                </div>

                {/* Email Delivery Notice */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
                  <Mail className="w-4 h-4 text-[#071952] shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    Please check the inbox (and spam/junk folder) for <strong className="text-slate-800">info@tecstellar.com</strong> to retrieve your OTP code.
                  </div>
                </div>

                {/* OTP Input */}
                <div className="space-y-1.5">
                  <label className="block text-[13px] font-semibold text-slate-800 text-center">
                    Enter 6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    autoFocus
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••••"
                    className="w-full py-3.5 px-4 rounded-xl border-2 border-[#071952]/30 bg-white text-slate-900 text-center font-mono text-2xl tracking-[0.45em] font-bold focus:outline-none focus:border-[#071952] shadow-2xs"
                  />
                </div>

                {/* Resend status message */}
                {resendSuccess && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold text-center flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{resendSuccess}</span>
                  </div>
                )}

                {/* Verify & Resend Buttons */}
                <div className="pt-2 space-y-2.5">
                  <button
                    type="submit"
                    disabled={loading || otpCode.length < 6}
                    className="w-full py-3.5 px-4 rounded-xl text-[13px] font-bold uppercase tracking-wider text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md bg-[#071952] hover:bg-[#0b2575] disabled:opacity-40"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>VERIFYING OTP...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>VERIFY &amp; SIGN IN</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between text-xs pt-1 px-1">
                    {countdown > 0 ? (
                      <span className="text-slate-400 font-mono text-[11px]">
                        Resend code in {countdown}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={resendLoading}
                        onClick={handleResend}
                        className="text-[#071952] font-semibold hover:underline cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
                      >
                        <RefreshCw className={`w-3 h-3 ${resendLoading ? 'animate-spin' : ''}`} />
                        <span>{resendLoading ? 'Dispatching...' : 'Resend OTP to Email'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setIsOtpStep(false);
                        setOtpCode('');
                        setError(null);
                        setResendSuccess(null);
                      }}
                      className="text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to login</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </form>

          {/* Legal / Policy Links */}
          <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-center gap-4 text-xs font-medium text-slate-500">
            {onOpenPrivacyPolicy && (
              <button
                type="button"
                onClick={onOpenPrivacyPolicy}
                className="hover:text-slate-900 underline transition-colors cursor-pointer"
              >
                Privacy Policy
              </button>
            )}
            <span className="text-slate-300">•</span>
            {onOpenDeleteAccount && (
              <button
                type="button"
                onClick={onOpenDeleteAccount}
                className="hover:text-slate-900 underline transition-colors cursor-pointer"
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
