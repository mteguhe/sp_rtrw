# Frontend-Backend Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the React frontend application to the Go backend API to enable real authentication (login via JWT) and dynamic CRUD of data (residents list and creation).

**Architecture:** Create an Axios instance with request/response interceptors to automatically manage JWT tokens. Implement an `AuthContext` to store user state and decode the JWT payload using a zero-dependency helper. Update components to bind to the API and render based on authenticated roles.

**Tech Stack:** React, TypeScript, Vite, TailwindCSS, Axios.

---

### Task 1: API Service and Authentication Context

**Files:**
- Create: `projects/si-digi-rtrw/frontend/src/services/api.ts`
- Create: `projects/si-digi-rtrw/frontend/src/context/AuthContext.tsx`
- Create: `projects/si-digi-rtrw/frontend/src/hooks/useAuth.ts`

- [ ] **Step 1: Create the API client**
  Create `projects/si-digi-rtrw/frontend/src/services/api.ts` to configure Axios with base URL and authorization interceptors:
  ```typescript
  import axios from 'axios';

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

  const api = axios.create({
    baseURL: API_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  api.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  export default api;
  ```

- [ ] **Step 2: Create the Auth Context**
  Create `projects/si-digi-rtrw/frontend/src/context/AuthContext.tsx` to handle login, token storage, and JWT decoding:
  ```typescript
  import React, { createContext, useState, useEffect, ReactNode } from 'react';
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
    try {
      const base64Url = token.split('.')[1];
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
      localStorage.setItem('token', token);
      const payload = parseJwt(token);
      setToken(token);
      setUser({
        id: payload.user_id,
        username: username,
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
  ```

- [ ] **Step 3: Create the custom useAuth hook**
  Create `projects/si-digi-rtrw/frontend/src/hooks/useAuth.ts`:
  ```typescript
  import { useContext } from 'react';
  import { AuthContext } from '../context/AuthContext';

  export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
      throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
  };
  ```

- [ ] **Step 4: Update index to use the AuthProvider**
  Modify `projects/si-digi-rtrw/frontend/src/main.tsx` to wrap `App` in `AuthProvider`:
  ```typescript
  import { StrictMode } from 'react'
  import { createRoot } from 'react-dom/client'
  import './index.css'
  import App from './App.tsx'
  import { AuthProvider } from './context/AuthContext.tsx'

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </StrictMode>,
  )
  ```

- [ ] **Step 5: Commit changes**
  Run:
  ```bash
  git add projects/si-digi-rtrw/frontend/src/services/api.ts projects/si-digi-rtrw/frontend/src/context/AuthContext.tsx projects/si-digi-rtrw/frontend/src/hooks/useAuth.ts projects/si-digi-rtrw/frontend/src/main.tsx
  git commit -m "feat: setup API client and authentication context with JWT parsing"
  ```

---

### Task 2: Login Page Integration

**Files:**
- Modify: `projects/si-digi-rtrw/frontend/src/pages/Login.tsx`

- [ ] **Step 1: Replace Login page simulated code with AuthContext calls**
  Modify `projects/si-digi-rtrw/frontend/src/pages/Login.tsx` to handle authentication through API request:
  ```typescript
  import React, { useState } from 'react';
  import { useNavigate } from 'react-router-dom';
  import { LogIn } from 'lucide-react';
  import { useAuth } from '../hooks/useAuth';

  const Login: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      if (!username || !password) {
        setError('Username dan password wajib diisi');
        return;
      }

      setSubmitting(true);
      try {
        await login(username, password);
        navigate('/admin/residents');
      } catch (err: any) {
        setError(err.response?.data?.error || 'Login gagal, periksa kembali username dan password Anda');
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="text-center mb-8">
            <div className="bg-blue-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <LogIn className="w-8 h-8 text-blue-500" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800">Selamat Datang</h2>
            <p className="text-gray-500">Silakan masuk ke SI-DIGI RT/RW</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="Masukkan username"
                disabled={submitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="••••••••"
                disabled={submitting}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50"
            >
              {submitting ? 'Menghubungkan...' : 'Masuk'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500">
              Belum punya akun? Hubungi Admin RT setempat.
            </p>
          </div>
        </div>
      </div>
    );
  };

  export default Login;
  ```

- [ ] **Step 2: Commit changes**
  Run:
  ```bash
  git add projects/si-digi-rtrw/frontend/src/pages/Login.tsx
  git commit -m "feat: integrate Login page with real authentication API"
  ```

---

### Task 3: Dashboard Layout and Dynamic Profile

**Files:**
- Modify: `projects/si-digi-rtrw/frontend/src/components/DashboardLayout.tsx`

- [ ] **Step 1: Update DashboardLayout to use real user data**
  Modify `projects/si-digi-rtrw/frontend/src/components/DashboardLayout.tsx` to render logged-in details, and implement logout:
  ```typescript
  import React, { ReactNode } from 'react';
  import { Link, useNavigate } from 'react-router-dom';
  import { Home, Users, FileText, Bell, LogOut } from 'lucide-react';
  import { useAuth } from '../hooks/useAuth';

  interface DashboardLayoutProps {
    children: ReactNode;
    role?: string;
  }

  const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
      logout();
      navigate('/login');
    };

    if (!user) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
          <p className="text-red-500 font-bold mb-4">Anda belum masuk ke sistem</p>
          <button 
            onClick={() => navigate('/login')} 
            className="bg-blue-600 text-white px-6 py-2 rounded-lg"
          >
            Menuju Halaman Login
          </button>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-50 flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-100 flex flex-col justify-between">
          <div className="p-6">
            <Link to="/" className="text-xl font-extrabold text-blue-600 tracking-wider">
              SI-DIGI RT/RW
            </Link>
            
            <nav className="mt-8 space-y-2">
              <Link to="/admin/residents" className="flex items-center gap-3 px-4 py-3 text-blue-600 bg-blue-50/50 rounded-xl font-bold">
                <Users className="w-5 h-5" />
                Data Warga
              </Link>
            </nav>
          </div>

          {/* User profile & logout */}
          <div className="p-6 border-t border-gray-100 space-y-4">
            <div>
              <p className="font-bold text-gray-800 text-sm truncate">{user.username}</p>
              <p className="text-xs text-gray-500">{user.role} {user.rt && `RT ${user.rt}`} {user.rw && `RW ${user.rw}`}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-600 py-2.5 rounded-xl text-sm font-bold hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Keluar
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-10 overflow-y-auto">
          {children}
        </main>
      </div>
    );
  };

  export default DashboardLayout;
  ```

- [ ] **Step 2: Commit changes**
  Run:
  ```bash
  git add projects/si-digi-rtrw/frontend/src/components/DashboardLayout.tsx
  git commit -m "feat: make DashboardLayout display logged-in profile and handle logout"
  ```

---

### Task 4: Residents Page Dynamic CRUD

**Files:**
- Modify: `projects/si-digi-rtrw/frontend/src/pages/admin/Residents.tsx`

- [ ] **Step 1: Update Residents list page with API fetching and creation form**
  Modify `projects/si-digi-rtrw/frontend/src/pages/admin/Residents.tsx` to handle state loading, error displays, and integrate dialog/form for adding residents:
  ```typescript
  import React, { useEffect, useState } from 'react';
  import DashboardLayout from '../../components/DashboardLayout';
  import { Plus, Search, X } from 'lucide-react';
  import api from '../../services/api';

  interface Resident {
    id: number;
    nik: string;
    full_name: string;
    address: string;
    rt: string;
    rw: string;
    status: string;
  }

  const Residents: React.FC = () => {
    const [residents, setResidents] = useState<Resident[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    
    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newNik, setNewNik] = useState('');
    const [newFullName, setNewFullName] = useState('');
    const [newAddress, setNewAddress] = useState('');
    const [newStatus, setNewStatus] = useState('Tetap');
    const [newFamilyId, setNewFamilyId] = useState('1'); // seed ID for mapping
    const [submitting, setSubmitting] = useState(false);

    const fetchResidents = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get('/api/rt/residents');
        setResidents(response.data || []);
      } catch (err: any) {
        setError('Gagal memuat data warga dari server');
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      fetchResidents();
    }, []);

    const handleCreateResident = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newNik || !newFullName || !newAddress) {
        alert('Mohon isi semua data wajib');
        return;
      }

      setSubmitting(true);
      try {
        await api.post('/api/rt/residents', {
          nik: newNik,
          full_name: newFullName,
          address: newAddress,
          status: newStatus,
          family_id: parseInt(newFamilyId),
          date_of_birth: new Date().toISOString(), // satisfying db constraints
        });
        
        setIsModalOpen(false);
        // Clear form
        setNewNik('');
        setNewFullName('');
        setNewAddress('');
        setNewStatus('Tetap');
        
        // Refresh list
        fetchResidents();
      } catch (err: any) {
        alert(err.response?.data?.error || 'Gagal menambahkan warga');
      } finally {
        setSubmitting(false);
      }
    };

    const filteredResidents = residents.filter(
      (res) =>
        res.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        res.nik.includes(searchQuery)
    );

    return (
      <DashboardLayout>
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Manajemen Warga</h1>
            <p className="text-gray-500 text-sm">Kelola data penduduk di lingkungan RT/RW setempat</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-5 h-5" />
            Tambah Warga
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 border border-red-100">
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari berdasarkan nama atau NIK..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">Memuat data...</div>
          ) : filteredResidents.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Tidak ada data warga ditemukan.</div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider font-bold">
                  <th className="px-6 py-4">Nama Lengkap</th>
                  <th className="px-6 py-4">NIK</th>
                  <th className="px-6 py-4">Alamat</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">RT / RW</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredResidents.map((res) => (
                  <tr key={res.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-800">{res.full_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{res.nik}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{res.address}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        res.status === 'Tetap' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {res.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">RT {res.rt} / RW {res.rw}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Create Resident Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 relative">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute right-4 top-4 p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
              
              <h2 className="text-xl font-bold text-gray-800 mb-6">Tambah Warga Baru</h2>
              
              <form onSubmit={handleCreateResident} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">NIK (Nomor Induk Kependudukan)</label>
                  <input
                    type="text"
                    required
                    value={newNik}
                    onChange={(e) => setNewNik(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-blue-500"
                    placeholder="Contoh: 320101XXXXXXXXXX"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-blue-500"
                    placeholder="Masukkan nama lengkap"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Alamat Rumah</label>
                  <input
                    type="text"
                    required
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-blue-500"
                    placeholder="Contoh: Blok A No. 12"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status Tinggal</label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-blue-500"
                    >
                      <option value="Tetap">Tetap</option>
                      <option value="Pindahan">Pindahan</option>
                      <option value="Kontrak">Kontrak</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">ID Keluarga (KK)</label>
                    <input
                      type="number"
                      required
                      value={newFamilyId}
                      onChange={(e) => setNewFamilyId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitting ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </DashboardLayout>
    );
  };

  export default Residents;
  ```

- [ ] **Step 2: Commit changes**
  Run:
  ```bash
  git add projects/si-digi-rtrw/frontend/src/pages/admin/Residents.tsx
  git commit -m "feat: bind Residents management page to backend API for CRUD"
  ```
