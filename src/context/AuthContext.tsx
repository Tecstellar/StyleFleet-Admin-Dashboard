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
}

const AUTH_STORAGE_KEY = 'stylefleet_admin_auth_session';

const VALID_EMAIL = 'stylefleet@tecstellar.com';
const VALID_PASSWORD = 'Stylefleetadmin@4321';

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

    if (cleanEmail === VALID_EMAIL && cleanPass === VALID_PASSWORD) {
      const adminUser: AdminUser = {
        email: 'Stylefleet@tecstellar.com',
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

  const logout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
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
