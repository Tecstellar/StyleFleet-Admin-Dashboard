import React, { createContext, useContext, useState, useEffect } from 'react';

export interface AdminUser {
  email: string;
  name: string;
  role: string;
  loginAt: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: AdminUser | null;
  login: (email: string, pass: string) => { success: boolean; error?: string };
  logout: () => void;
  updateAdminPassword: (newPass: string, currentPass?: string) => { success: boolean; error?: string };
}

const AUTH_STORAGE_KEY = 'stylefleet_admin_auth_session';
const ADMIN_PASS_KEY = 'stylefleet_admin_custom_pwd';

const VALID_EMAIL = 'stylefleet@tecstellar.com';
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

  const login = (email: string, pass: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = pass.trim();
    const validPass = localStorage.getItem(ADMIN_PASS_KEY) || DEFAULT_PASSWORD;

    if (cleanEmail === VALID_EMAIL && cleanPass === validPass) {
      const adminUser: AdminUser = {
        email: 'stylefleet@tecstellar.com',
        name: 'Master Operator',
        role: 'Super Admin',
        loginAt: new Date().toISOString(),
      };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(adminUser));
      setUser(adminUser);
      return { success: true };
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
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, updateAdminPassword }}>
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
