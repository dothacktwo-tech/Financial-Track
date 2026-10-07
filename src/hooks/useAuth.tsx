import React, { createContext, useContext, useEffect, useState } from 'react';
import { Profile } from '../types/database';
import { dataStore, defaultUsers } from '../lib/dataStore';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthContextType {
  user: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password?: string) => Promise<void>;
  register: (fullName: string, email: string, password?: string) => Promise<void>;
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
          const profile = await dataStore.getProfile(session.user.id);
          if (profile) {
            setUser(profile);
            setLoading(false);
            return;
          }
        }
      }

      // Local persistent session
      const savedUserId = localStorage.getItem(CURRENT_USER_ID_KEY) || defaultUsers[0].id;
      const profiles = await dataStore.getProfiles();
      const matched = profiles.find((p) => p.id === savedUserId) || profiles[0] || defaultUsers[0];
      setUser(matched);
      localStorage.setItem(CURRENT_USER_ID_KEY, matched.id);
    } catch (e) {
      console.error('Failed to load user:', e);
      setUser(defaultUsers[0]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();

    const handleStorageUpdate = () => {
      loadUser();
    };
    window.addEventListener('fintrack_db_updated', handleStorageUpdate);
    return () => window.removeEventListener('fintrack_db_updated', handleStorageUpdate);
  }, []);

  const login = async (email: string, password?: string) => {
    setLoading(true);
    try {
      if (isSupabaseConfigured && supabase && password) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) {
          const profile = await dataStore.getProfile(data.user.id);
          if (profile) {
            setUser(profile);
            localStorage.setItem(CURRENT_USER_ID_KEY, profile.id);
            await dataStore.addAuditLog(profile.id, 'LOGIN', 'auth', profile.id, { email });
            return;
          }
        }
      }

      // Find user by email in local store
      const profiles = await dataStore.getProfiles();
      let matched = profiles.find((p) => p.email?.toLowerCase() === email.toLowerCase());

      if (!matched) {
        // If not found in demo, create or fallback
        matched = {
          id: 'user-' + Date.now(),
          email,
          full_name: email.split('@')[0],
          role: email.includes('admin') ? 'admin' : 'user',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        profiles.push(matched);
      }

      setUser(matched);
      localStorage.setItem(CURRENT_USER_ID_KEY, matched.id);
      await dataStore.addAuditLog(matched.id, 'LOGIN', 'auth', matched.id, { email });
    } finally {
      setLoading(false);
    }
  };

  const register = async (fullName: string, email: string, password?: string) => {
    setLoading(true);
    try {
      if (isSupabaseConfigured && supabase && password) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (error) throw error;
      }

      const newProfile: Profile = {
        id: 'user-' + Date.now(),
        email,
        full_name: fullName,
        role: 'user',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const profiles = await dataStore.getProfiles();
      profiles.push(newProfile);
      setUser(newProfile);
      localStorage.setItem(CURRENT_USER_ID_KEY, newProfile.id);
      await dataStore.addAuditLog(newProfile.id, 'REGISTER', 'auth', newProfile.id, { email, full_name: fullName });
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
