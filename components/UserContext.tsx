'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, SystemSettings } from '@/lib/types';

interface UserContextType {
  currentUser: User | null;
  allUsers: User[];
  settings: SystemSettings | null;
  loading: boolean;
  login: (params: { email?: string; userId?: string }) => Promise<{ success: boolean; error?: string; user?: User }>;
  logout: () => Promise<void>;
  switchUser: (userId: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  currentUser: null,
  allUsers: [],
  settings: null,
  loading: true,
  login: async () => ({ success: false }),
  logout: async () => {},
  switchUser: async () => {},
  refreshUser: async () => {},
  refreshSettings: async () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const search = typeof window !== 'undefined' ? window.location.search : '';
      const res = await fetch(`/api/auth/me${search}`);
      const data = await res.json();
      if (data.allUsers) {
        setAllUsers(data.allUsers);
      }
      if (data.user) {
        setCurrentUser(data.user);
      } else {
        setCurrentUser(null);
      }
    } catch (err) {
      console.error('Failed to load user', err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.settings) {
        setSettings(data.settings);
      }
    } catch (err) {
      console.error('Failed to load settings', err);
    }
  };

  useEffect(() => {
    Promise.all([fetchUser(), fetchSettings()]).finally(() => setLoading(false));
  }, []);

  const login = async (params: { email?: string; userId?: string }) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Login failed' };
      }
      if (data.user) {
        setCurrentUser(data.user);
      }
      return { success: true, user: data.user };
    } catch (err: any) {
      return { success: false, error: err.message || 'Login error' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error', err);
    } finally {
      setCurrentUser(null);
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  };

  const switchUser = async (userId: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.user) {
        setCurrentUser(data.user);
      }
    } catch (err) {
      console.error('Failed to switch user', err);
    }
  };

  return (
    <UserContext.Provider
      value={{
        currentUser,
        allUsers,
        settings,
        loading,
        login,
        logout,
        switchUser,
        refreshUser: fetchUser,
        refreshSettings: fetchSettings,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
