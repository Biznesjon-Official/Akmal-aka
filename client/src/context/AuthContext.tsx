'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from '@/lib/axios';

interface User {
  id: string;
  username: string;
  role: 'admin' | 'yordamchi';
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Token muddatini tekshirish
  const checkTokenExpiration = () => {
    if (typeof window === 'undefined') return;
    
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      // JWT tokenni decode qilish (base64)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expirationTime = payload.exp * 1000; // milliseconds ga o'tkazish
      const currentTime = Date.now();

      // Token muddati tugagan bo'lsa
      if (currentTime >= expirationTime) {
        logout();
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('Token tekshirishda xatolik:', error);
      logout();
      window.location.href = '/login';
    }
  };

  useEffect(() => {
    // Faqat client-side da ishlash uchun
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        checkTokenExpiration();
        fetchUser();
        
        // Har 5 daqiqada token muddatini tekshirish
        const interval = setInterval(checkTokenExpiration, 5 * 60 * 1000);
        return () => clearInterval(interval);
      } else {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const response = await axios.get('/auth/me');
      setUser(response.data);
    } catch (error) {
      console.error('fetchUser xatosi:', error);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      const response = await axios.post('/auth/login', {
        username,
        password,
      });
      
      const { token, user } = response.data;
      
      // Faqat client-side da localStorage ishlatish
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', token);
      }
      
      setUser(user);
      
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Kirish xatosi',
      };
    }
  };

  const logout = () => {
    // Faqat client-side da localStorage ishlatish
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
    
    setUser(null);
  };

  const value = {
    user,
    login,
    logout,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};