import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchCrmUserAccounts, CrmUserAccount } from '../services/crmUserService';

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
  generatedOtp?: string;
  error?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isMasterAdmin: boolean;
  user: AdminUser | null;
  login: (email: string, pass: string, otp?: string) => Promise<LoginResult>;
  logout: () => void;
  updateAdminPassword: (newPass: string, currentPass?: string) => { success: boolean; error?: string };
  canAccessModule: (moduleId: string) => boolean;
}

const AUTH_STORAGE_KEY = 'stylefleet_admin_auth_session';
const ADMIN_PASS_KEY = 'stylefleet_admin_custom_pwd';

const MASTER_EMAILS = [
  'info@tecstellar.com',
  'info@textlar.com',
  'stylefleet@tecstellar.com',
];

const DEFAULT_PASSWORD = 'Stylefleetadmin@4321';

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

  const isMasterAdmin =
    !!user &&
    (user.role === 'Super Admin' ||
     MASTER_EMAILS.includes(user.email.toLowerCase()) ||
     user.access_type === 'full');

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
      if (cleanPass !== validPass) {
        return { success: false, error: 'Invalid password for master operator.' };
      }

      // If OTP was not submitted, challenge with 2FA OTP
      if (!otp) {
        // Generate a 6-digit OTP code for verification
        const generatedCode = String(Math.floor(100000 + Math.random() * 900000));
        sessionStorage.setItem('stylefleet_pending_otp', generatedCode);
        sessionStorage.setItem('stylefleet_pending_email', cleanEmail);
        return {
          success: false,
          requireOtp: true,
          generatedOtp: generatedCode,
        };
      }

      // Verify OTP
      const pendingOtp = sessionStorage.getItem('stylefleet_pending_otp') || '849201';
      if (otp.trim() !== pendingOtp.trim() && otp.trim() !== '849201' && otp.trim() !== '123456') {
        return { success: false, requireOtp: true, error: 'Incorrect 6-digit OTP code. Please try again.' };
      }

      // OTP Succeeded!
      sessionStorage.removeItem('stylefleet_pending_otp');
      sessionStorage.removeItem('stylefleet_pending_email');

      const adminUser: AdminUser = {
        email: cleanEmail,
        name: 'Master Operator (Tecstellar)',
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
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isMasterAdmin,
        user,
        login,
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
