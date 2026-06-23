import React, { createContext, useState, useEffect, type ReactNode } from 'react';
import api from '../services/api';

export interface User {
  id: number;
  username: string;
  role: 'Admin RW' | 'Admin RT' | 'Warga';
  rt?: string;
  rw?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to parse JWT payload without external library
const parseJwt = (token: string): any => {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  const base64Url = parts[1];
  try {
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      const payload = parseJwt(storedToken);
      if (payload && payload.exp * 1000 > Date.now()) {
        setToken(storedToken);
        setUser({
          id: payload.user_id,
          username: payload.username || '',
          role: payload.role,
          rt: payload.rt,
          rw: payload.rw,
        });
      } else {
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    const response = await api.post('/api/login', { username, password });
    const { token } = response.data;
    const payload = parseJwt(token);
    if (!payload) {
      throw new Error('Gagal memproses token autentikasi dari server');
    }
    localStorage.setItem('token', token);
    setToken(token);
    setUser({
      id: payload.user_id,
      username,
      role: payload.role,
      rt: payload.rt,
      rw: payload.rw,
    });
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
