import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchCrmUserAccounts, CrmUserAccount } from '../services/crmUserService';
import { sendSuperAdminOtp } from '../services/otpService';

export interface AdminUser {
  id?: string;
  email: string;
  name: string;
  role: string; // 'Super Admin' | 'admin' | 'staff'
  access_type?: 'full' | 'strict';
  allowed_modules?: string[];
  loginAt: string;
}

interface LoginResult {
  success: boolean;
  requireOtp?: boolean;
  error?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isMasterAdmin: boolean;
  user: AdminUser | null;
  login: (email: string, pass: string, otp?: string) => Promise<LoginResult>;
  resendOtp: (email: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateAdminPassword: (newPass: string, currentPass?: string) => { success: boolean; error?: string };
  canAccessModule: (moduleId: string) => boolean;
}

const AUTH_STORAGE_KEY = 'stylefleet_admin_auth_session';
const ADMIN_PASS_KEY = 'stylefleet_admin_custom_pwd';

const MASTER_EMAILS = [
  'info@tecstellar.com',
  'info@textellar.com',
  'info@textallot.com',
  'info@textlar.com',
  'stylefleet@tecstellar.com',
];

const DEFAULT_PASSWORD = 'tecstellar@123';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to parse auth session:', e);
    }
    return null;
  });

  const isAuthenticated = !!user;

  // Only the Super Admin (info@tecstellar.com / MASTER_EMAILS) can add user accounts
  const isMasterAdmin =
    !!user &&
    (user.role === 'Super Admin' ||
     MASTER_EMAILS.includes(user.email.toLowerCase()));

  const canAccessModule = (moduleId: string): boolean => {
    if (!user) return false;
    if (isMasterAdmin || user.access_type === 'full' || !user.access_type) return true;
    if (user.access_type === 'strict' && Array.isArray(user.allowed_modules)) {
      return user.allowed_modules.includes(moduleId);
    }
    return true;
  };

  const login = async (email: string, pass: string, otp?: string): Promise<LoginResult> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = pass.trim();
    const validPass = localStorage.getItem(ADMIN_PASS_KEY) || DEFAULT_PASSWORD;

    // 1. Check Master Super Admin Account
    if (MASTER_EMAILS.includes(cleanEmail)) {
      if (cleanPass !== 'tecstellar@123' && cleanPass !== 'textellar@123' && cleanPass !== validPass && cleanPass !== 'Stylefleetadmin@4321') {
        return { success: false, error: 'Invalid password for super admin.' };
      }

      // If OTP was not submitted, challenge with 2FA OTP and send real email via Resend
      if (!otp) {
        // Generate a 6-digit OTP code for verification
        const generatedCode = String(Math.floor(100000 + Math.random() * 900000));
        sessionStorage.setItem('stylefleet_pending_otp', generatedCode);
        sessionStorage.setItem('stylefleet_pending_email', cleanEmail);
        sessionStorage.setItem('stylefleet_pending_otp_timestamp', String(Date.now()));

        const sendRes = await sendSuperAdminOtp(cleanEmail, generatedCode);
        if (!sendRes.success) {
          console.warn('Resend OTP dispatch warning:', sendRes.error);
        }

        return {
          success: false,
          requireOtp: true,
        };
      }

      // Verify OTP (10-minute validity)
      const pendingOtp = sessionStorage.getItem('stylefleet_pending_otp');
      const timestamp = Number(sessionStorage.getItem('stylefleet_pending_otp_timestamp') || '0');
      const isExpired = Date.now() - timestamp > 10 * 60 * 1000;

      if (isExpired) {
        return {
          success: false,
          requireOtp: true,
          error: 'Your 6-digit OTP code has expired (10 min limit). Please click "Resend OTP" for a new code.',
        };
      }

      if (!pendingOtp || otp.trim() !== pendingOtp.trim()) {
        return {
          success: false,
          requireOtp: true,
          error: 'Incorrect 6-digit OTP code. Please enter the OTP sent to info@tecstellar.com.',
        };
      }

      // OTP Succeeded!
      sessionStorage.removeItem('stylefleet_pending_otp');
      sessionStorage.removeItem('stylefleet_pending_email');
      sessionStorage.removeItem('stylefleet_pending_otp_timestamp');

      const adminUser: AdminUser = {
        email: 'info@tecstellar.com',
        name: 'Tecstellar Super Admin',
        role: 'Super Admin',
        access_type: 'full',
        allowed_modules: [],
        loginAt: new Date().toISOString(),
      };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(adminUser));
      setUser(adminUser);
      return { success: true };
    }

    // 2. Check Staff and Created Accounts
    try {
      const crmUsers = await fetchCrmUserAccounts();
      const matched = crmUsers.find(
        (u) => u.email.toLowerCase() === cleanEmail && u.password === cleanPass
      );

      if (matched) {
        const staffUser: AdminUser = {
          id: matched.id,
          email: matched.email,
          name: matched.name,
          role: matched.crm_role === 'admin' ? 'Administrator' : 'Staff',
          access_type: matched.access_type,
          allowed_modules: matched.allowed_modules || [],
          loginAt: new Date().toISOString(),
        };
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(staffUser));
        setUser(staffUser);
        return { success: true };
      }
    } catch (err) {
      console.warn('Error checking CRM staff users:', err);
    }

    return {
      success: false,
      error: 'Invalid credentials. Please verify your email and password.',
    };
  };

  const resendOtp = async (email: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!MASTER_EMAILS.includes(cleanEmail)) {
      return { success: false, error: 'OTP is only required for Super Admin accounts.' };
    }
    const generatedCode = String(Math.floor(100000 + Math.random() * 900000));
    sessionStorage.setItem('stylefleet_pending_otp', generatedCode);
    sessionStorage.setItem('stylefleet_pending_email', cleanEmail);
    sessionStorage.setItem('stylefleet_pending_otp_timestamp', String(Date.now()));

    const sendRes = await sendSuperAdminOtp(cleanEmail, generatedCode);
    if (!sendRes.success) {
      return { success: false, error: sendRes.error || 'Failed to dispatch email' };
    }
    return { success: true };
  };

  const updateAdminPassword = (newPass: string, currentPass?: string) => {
    const currentSaved = localStorage.getItem(ADMIN_PASS_KEY) || DEFAULT_PASSWORD;
    if (currentPass && currentPass.trim() !== currentSaved) {
      return { success: false, error: 'Current admin password does not match.' };
    }
    if (!newPass || newPass.trim().length < 6) {
      return { success: false, error: 'New password must be at least 6 characters long.' };
    }
    localStorage.setItem(ADMIN_PASS_KEY, newPass.trim());
    return { success: true };
  };

  const logout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem('stylefleet_pending_otp');
    sessionStorage.removeItem('stylefleet_pending_email');
    sessionStorage.removeItem('stylefleet_pending_otp_timestamp');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isMasterAdmin,
        user,
        login,
        resendOtp,
        logout,
        updateAdminPassword,
        canAccessModule,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
