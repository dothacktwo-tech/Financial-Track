import React, { createContext, useContext, useEffect, useState } from 'react';
import { Profile } from '../types/database';
import { dataStore, defaultUsers } from '../lib/dataStore';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthContextType {
  user: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  login: (username: string, password?: string) => Promise<void>;
  register: (fullName: string, username: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  switchUser: (role: 'user' | 'admin') => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CURRENT_USER_ID_KEY = 'fintrack_current_user_id';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          let profile = await dataStore.getProfile(session.user.id);
          if (!profile) {
            profile = {
              id: session.user.id,
              email: session.user.email || '',
              full_name: (session.user.user_metadata as any)?.full_name || session.user.email?.split('@')[0] || 'Pengguna',
              avatar_url: (session.user.user_metadata as any)?.avatar_url,
              role: (session.user.email?.includes('admin') ? 'admin' : 'user'),
              status: 'active',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            await dataStore.updateProfile(session.user.id, profile);
          }
          if (profile) {
            setUser(profile);
            localStorage.setItem(CURRENT_USER_ID_KEY, profile.id);
            setLoading(false);
            return;
          }
        }
      }

      // Local persistent session
      const savedUserId = localStorage.getItem(CURRENT_USER_ID_KEY);
      if (savedUserId) {
        const profiles = await dataStore.getProfiles();
        const matched = profiles.find((p) => p.id === savedUserId);
        if (matched && matched.status !== 'inactive') {
          setUser((prev) => {
            if (
              prev &&
              prev.id === matched.id &&
              prev.full_name === matched.full_name &&
              prev.avatar_url === matched.avatar_url &&
              prev.role === matched.role &&
              prev.status === matched.status
            ) {
              return prev;
            }
            return matched;
          });
          setLoading(false);
          return;
        } else {
          localStorage.removeItem(CURRENT_USER_ID_KEY);
        }
      }

      // No active session -> show login page
      setUser(null);
    } catch (e) {
      console.error('Failed to load user session:', e);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();

    const handleProfileUpdated = (e: any) => {
      if (e.detail) {
        setUser(e.detail);
      } else {
        loadUser();
      }
    };

    window.addEventListener('fintrack_profile_updated', handleProfileUpdated);
    return () => {
      window.removeEventListener('fintrack_profile_updated', handleProfileUpdated);
    };
  }, []);

  const login = async (username: string, password?: string) => {
    setLoading(true);
    try {
      const cleanUsername = username.trim().toLowerCase();

      // 1. Coba login melalui Supabase Auth jika username berbentuk email & terkonfigurasi
      if (isSupabaseConfigured && supabase && password && cleanUsername.includes('@')) {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({ email: cleanUsername, password });
          if (!error && data?.user) {
            let profile = await dataStore.getProfile(data.user.id);
            if (profile) {
              if (profile.status === 'inactive') {
                throw new Error('Akun Anda dinonaktifkan oleh Administrator.');
              }
              setUser(profile);
              localStorage.setItem(CURRENT_USER_ID_KEY, profile.id);
              await dataStore.addAuditLog(profile.id, 'LOGIN', 'auth', profile.id, { username: profile.username || cleanUsername, method: 'supabase_auth' });
              return;
            }
          }
        } catch (supabaseErr: any) {
          console.warn('[useAuth] Supabase Auth notice:', supabaseErr.message);
        }
      }

      // 2. Validasi autentikasi login dengan USERNAME melalui data manajemen pengguna
      const verified = await dataStore.authenticateUser(cleanUsername, password);

      setUser(verified);
      localStorage.setItem(CURRENT_USER_ID_KEY, verified.id);
      await dataStore.addAuditLog(verified.id, 'LOGIN', 'auth', verified.id, { username: verified.username, role: verified.role });
    } finally {
      setLoading(false);
    }
  };

  const register = async (fullName: string, username: string, password?: string) => {
    setLoading(true);
    try {
      const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, '');
      const created = await dataStore.createUser({
        full_name: fullName.trim(),
        username: cleanUsername,
        password: password || '123456',
        role: 'user',
        status: 'active',
      });

      setUser(created);
      localStorage.setItem(CURRENT_USER_ID_KEY, created.id);
      await dataStore.addAuditLog(created.id, 'REGISTER', 'auth', created.id, { username: cleanUsername, full_name: fullName });
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    if (user) {
      await dataStore.addAuditLog(user.id, 'LOGOUT', 'auth', user.id);
    }
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem(CURRENT_USER_ID_KEY);
    setUser(null);
  };

  const switchUser = async (role: 'user' | 'admin') => {
    const profiles = await dataStore.getProfiles();
    const target = profiles.find((p) => p.role === role) || defaultUsers.find((p) => p.role === role);
    if (target) {
      setUser(target);
      localStorage.setItem(CURRENT_USER_ID_KEY, target.id);
      await dataStore.addAuditLog(target.id, 'SWITCH_ACCOUNT', 'auth', target.id, { role });
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const updated = await dataStore.getProfile(user.id);
      if (updated) setUser(updated);
    }
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin,
        login,
        register,
        logout,
        switchUser,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
