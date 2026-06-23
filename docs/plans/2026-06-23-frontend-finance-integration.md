# Frontend Finance Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the Finance (Keuangan) dashboard page in the React frontend and integrate it with the Go backend's multi-tenancy financial transaction and summary APIs.

**Architecture:** Create a new page `Finance.tsx` rendering summary metrics cards (income, expense, balance) and a history table of transactions. Implement a filter for RT vs RW level cash flows (visible to Admin RW). Create a modal form for recording transactions, which enforces RT/RW and level settings based on the logged-in user's role.

**Tech Stack:** React, TypeScript, Vite, TailwindCSS, Lucide Icons, Axios (API client).

---

### Task 1: Route Setup and Navigation Link

**Files:**
- Modify: `projects/si-digi-rtrw/frontend/src/components/DashboardLayout.tsx`
- Modify: `projects/si-digi-rtrw/frontend/src/App.tsx`

- [ ] **Step 1: Add Keuangan link to sidebar**
  Modify `projects/si-digi-rtrw/frontend/src/components/DashboardLayout.tsx` to import `DollarSign` from `lucide-react` and add the Keuangan sidebar item:
  ```typescript
  // Around line 3: Add DollarSign to lucide-react imports
  import { Users, LogOut, DollarSign } from 'lucide-react';
  ```
  ```typescript
  // Around line 40: Add Link in the sidebar navigation section
  const isFinanceActive = location.pathname === '/admin/finance';
  ```
  ```typescript
  // Around line 44: Add link inside nav tag
  <nav className="mt-8 space-y-2">
    <Link to="/admin/residents" className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${
      isResidentsActive 
        ? 'text-primary bg-primary/10' 
        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
    }`}>
      <Users className="w-5 h-5" />
      Data Warga
    </Link>
    <Link to="/admin/finance" className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${
      isFinanceActive 
        ? 'text-primary bg-primary/10' 
        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
    }`}>
      <DollarSign className="w-5 h-5" />
      Keuangan Kas
    </Link>
  </nav>
  ```

- [ ] **Step 2: Add Route to App Router**
  Modify `projects/si-digi-rtrw/frontend/src/App.tsx` to import `Finance` and configure the path `/admin/finance`:
  ```typescript
  // Around line 6: import Finance page
  import Finance from './pages/admin/Finance';
  ```
  ```typescript
  // Around line 55: Add Route inside Routes
  <Route path="/admin/residents" element={<Residents />} />
  <Route path="/admin/finance" element={<Finance />} />
  ```

- [ ] **Step 3: Create empty placeholder file to prevent compile failure**
  Create `projects/si-digi-rtrw/frontend/src/pages/admin/Finance.tsx` with a basic component layout:
  ```typescript
  import React from 'react';
  import DashboardLayout from '../../components/DashboardLayout';

  const Finance: React.FC = () => {
    return (
      <DashboardLayout>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Keuangan Kas</h1>
          <p className="text-gray-500">Halaman rekap keuangan RT/RW</p>
        </div>
      </DashboardLayout>
    );
  };

  export default Finance;
  ```

- [ ] **Step 4: Verify compilation succeeds**
  Run: `npm run build` in `projects/si-digi-rtrw/frontend`
  Expected: PASS

- [ ] **Step 5: Commit changes**
  Run:
  ```bash
  git add projects/si-digi-rtrw/frontend/src/components/DashboardLayout.tsx projects/si-digi-rtrw/frontend/src/App.tsx projects/si-digi-rtrw/frontend/src/pages/admin/Finance.tsx
  git commit -m "feat: setup navigation link and routing for Finance page"
  ```

---

### Task 2: Finance Dashboard UI and API Integration

**Files:**
- Modify: `projects/si-digi-rtrw/frontend/src/pages/admin/Finance.tsx`

- [ ] **Step 1: Replace Finance page with full dashboard layout and state handling**
  Modify `projects/si-digi-rtrw/frontend/src/pages/admin/Finance.tsx` to pull and render summary metrics (`GET /api/finance/summary`) and listing (`GET /api/finance/reports`), and support filtering level for `Admin RW`:
  ```typescript
  import React, { useEffect, useState } from 'react';
  import DashboardLayout from '../../components/DashboardLayout';
  import { Plus, Search, TrendingUp, TrendingDown, Wallet, X } from 'lucide-react';
  import api from '../../services/api';
  import { useAuth } from '../../hooks/useAuth';

  interface Transaction {
    id: number;
    amount: number;
    type: 'Pemasukan' | 'Pengeluaran';
    category: string;
    description: string;
    level: 'RT' | 'RW';
    rt: string;
    rw: string;
    date: string;
  }

  interface Summary {
    total_income: number;
    total_expense: number;
    balance: number;
  }

  const Finance: React.FC = () => {
    const { user } = useAuth();
    const [reports, setReports] = useState<Transaction[]>([]);
    const [summary, setSummary] = useState<Summary>({ total_income: 0, total_expense: 0, balance: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [levelFilter, setLevelFilter] = useState<'RT' | 'RW' | ''>(''); // default to empty (both/jurisdiction defaults)

    // Form modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newAmount, setNewAmount] = useState('');
    const [newType, setNewType] = useState<'Pemasukan' | 'Pengeluaran'>('Pemasukan');
    const [newCategory, setNewCategory] = useState('Kas');
    const [newDescription, setNewDescription] = useState('');
    const [newLevel, setNewLevel] = useState<'RT' | 'RW'>('RT');
    const [newRt, setNewRt] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Auto-set transaction level based on user role
    useEffect(() => {
      if (user) {
        if (user.role === 'Admin RT') {
          setNewLevel('RT');
          setLevelFilter('RT');
        } else if (user.role === 'Admin RW') {
          setNewLevel('RW');
          setLevelFilter('RW');
        }
      }
    }, [user]);

    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const queryParam = levelFilter ? `?level=${levelFilter}` : '';
        const [reportsRes, summaryRes] = await Promise.all([
          api.get(`/api/finance/reports${queryParam}`),
          api.get(`/api/finance/summary${queryParam}`),
        ]);
        setReports(reportsRes.data || []);
        setSummary(summaryRes.data || { total_income: 0, total_expense: 0, balance: 0 });
      } catch (err: any) {
        setError('Gagal memuat rekap keuangan kas dari server');
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      fetchData();
    }, [levelFilter]);

    const handleCreateTransaction = async (e: React.FormEvent) => {
      e.preventDefault();
      const amountVal = parseFloat(newAmount);
      if (isNaN(amountVal) || amountVal <= 0) {
        alert('Nominal transaksi harus berupa angka positif');
        return;
      }
      if (!newCategory || !newDescription) {
        alert('Kategori dan Deskripsi wajib diisi');
        return;
      }
      if (user?.role === 'Admin RW' && newLevel === 'RT' && !newRt) {
        alert('RT harus ditentukan untuk transaksi tingkat RT');
        return;
      }

      setSubmitting(true);
      try {
        await api.post('/api/finance/transaction', {
          amount: amountVal,
          type: newType,
          category: newCategory,
          description: newDescription,
          level: newLevel,
          rt: user?.role === 'Admin RT' ? user.rt : (newLevel === 'RT' ? newRt : ''),
          date: new Date().toISOString(),
        });

        setIsModalOpen(false);
        // Clear form
        setNewAmount('');
        setNewType('Pemasukan');
        setNewCategory('Kas');
        setNewDescription('');
        setNewRt('');

        // Refresh data
        fetchData();
      } catch (err: any) {
        alert(err.response?.data?.error || 'Gagal merekam transaksi keuangan');
      } finally {
        setSubmitting(false);
      }
    };

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
    };

    const formatShortDate = (dateStr: string) => {
      try {
        return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
      } catch (e) {
        return dateStr;
      }
    };

    const canAddTransaction = user?.role === 'Admin RT' || user?.role === 'Admin RW';

    return (
      <DashboardLayout>
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Keuangan Kas</h1>
            <p className="text-gray-500 text-sm">Monitor rekap keuangan kas pemasukan dan pengeluaran</p>
          </div>
          <div className="flex items-center gap-4">
            {user?.role === 'Admin RW' && (
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value as 'RT' | 'RW' | '')}
                className="px-3 py-2 border border-gray-200 rounded-lg outline-none bg-white font-medium text-sm"
              >
                <option value="">Semua Tingkat</option>
                <option value="RT">Tingkat RT</option>
                <option value="RW">Tingkat RW</option>
              </select>
            )}
            {canAddTransaction && (
              <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20"
              >
                <Plus className="w-5 h-5" />
                Catat Transaksi
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 border border-red-100">
            {error}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-green-50 rounded-xl text-green-600">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-400 text-xs font-bold uppercase">Total Pemasukan</p>
              <h3 className="text-2xl font-extrabold text-gray-800 mt-1">{formatCurrency(summary.total_income)}</h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-red-50 rounded-xl text-red-600">
              <TrendingDown className="w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-400 text-xs font-bold uppercase">Total Pengeluaran</p>
              <h3 className="text-2xl font-extrabold text-gray-800 mt-1">{formatCurrency(summary.total_expense)}</h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-xl text-primary">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-400 text-xs font-bold uppercase">Sisa Saldo Kas</p>
              <h3 className={`text-2xl font-extrabold mt-1 ${summary.balance >= 0 ? 'text-gray-800' : 'text-red-600'}`}>
                {formatCurrency(summary.balance)}
              </h3>
            </div>
          </div>
        </div>

        {/* Table List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Memuat data...</div>
          ) : reports.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Tidak ada riwayat transaksi kas ditemukan.</div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider font-bold">
                  <th className="px-6 py-4">Tanggal</th>
                  <th className="px-6 py-4">Kategori</th>
                  <th className="px-6 py-4">Deskripsi</th>
                  <th className="px-6 py-4">Tingkat</th>
                  <th className="px-6 py-4">RT / RW</th>
                  <th className="px-6 py-4 text-right">Nominal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reports.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-500">{formatShortDate(item.date)}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded font-medium">{item.category}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 font-medium">{item.description}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.level === 'RT' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-purple-50 text-purple-700 border border-purple-100'
                      }`}>
                        {item.level}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {item.level === 'RT' ? `RT ${item.rt} / RW ${item.rw}` : `RW ${item.rw}`}
                    </td>
                    <td className={`px-6 py-4 text-right font-extrabold text-sm ${
                      item.type === 'Pemasukan' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {item.type === 'Pemasukan' ? '+' : '-'} {formatCurrency(item.amount).replace('Rp', '')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Create Transaction Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 relative">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute right-4 top-4 p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
              
              <h2 className="text-xl font-bold text-gray-800 mb-6">Catat Transaksi Keuangan</h2>
              
              <form onSubmit={handleCreateTransaction} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="newType" className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipe Transaksi</label>
                    <select
                      id="newType"
                      name="newType"
                      value={newType}
                      onChange={(e) => setNewType(e.target.value as 'Pemasukan' | 'Pengeluaran')}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-primary bg-white"
                    >
                      <option value="Pemasukan">Pemasukan (Kas Masuk)</option>
                      <option value="Pengeluaran">Pengeluaran (Kas Keluar)</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="newCategory" className="block text-xs font-bold text-gray-500 uppercase mb-1">Kategori</label>
                    <input
                      id="newCategory"
                      name="newCategory"
                      type="text"
                      required
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-primary"
                      placeholder="Contoh: Iuran Bulanan, Sampah"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="newAmount" className="block text-xs font-bold text-gray-500 uppercase mb-1">Nominal (Rupiah)</label>
                  <input
                    id="newAmount"
                    name="newAmount"
                    type="number"
                    required
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-primary"
                    placeholder="Masukkan jumlah uang"
                  />
                </div>

                <div>
                  <label htmlFor="newDescription" className="block text-xs font-bold text-gray-500 uppercase mb-1">Deskripsi</label>
                  <textarea
                    id="newDescription"
                    name="newDescription"
                    required
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-primary h-20 resize-none"
                    placeholder="Masukkan keterangan detail transaksi"
                  />
                </div>

                {user?.role === 'Admin RW' && (
                  <div className="grid grid-cols-2 gap-4 border-t border-gray-50 pt-4">
                    <div>
                      <label htmlFor="newLevel" className="block text-xs font-bold text-gray-500 uppercase mb-1">Tingkat Kas</label>
                      <select
                        id="newLevel"
                        name="newLevel"
                        value={newLevel}
                        onChange={(e) => setNewLevel(e.target.value as 'RT' | 'RW')}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-primary bg-white"
                      >
                        <option value="RW">Kas Tingkat RW</option>
                        <option value="RT">Kas Tingkat RT</option>
                      </select>
                    </div>
                    {newLevel === 'RT' && (
                      <div>
                        <label htmlFor="newRt" className="block text-xs font-bold text-gray-500 uppercase mb-1">Target No RT</label>
                        <input
                          id="newRt"
                          name="newRt"
                          type="text"
                          required
                          value={newRt}
                          onChange={(e) => setNewRt(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-primary"
                          placeholder="Misal: 01, 02"
                        />
                      </div>
                    )}
                  </div>
                )}

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
                    className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:opacity-90 disabled:opacity-50"
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

  export default Finance;
  ```

- [ ] **Step 2: Verify frontend compilation and build succeeded**
  Run: `npm run build` in `projects/si-digi-rtrw/frontend`
  Expected: PASS

- [ ] **Step 3: Commit changes**
  Run:
  ```bash
  git add projects/si-digi-rtrw/frontend/src/pages/admin/Finance.tsx
  git commit -m "feat: complete Finance page layout and integration with summary and reports API"
  ```
