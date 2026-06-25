import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { 
  Users, 
  FileText, 
  AlertTriangle, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight, 
  Megaphone,
  Home
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { Link } from 'react-router-dom';

interface StatsData {
  total_residents: number;
  total_families: number;
  pending_letters: number;
  active_complaints: number;
  total_income: number;
  total_expense: number;
  current_balance: number;
}

interface Announcement {
  id: number;
  title: string;
  content: string;
  level: string;
  created_at: string;
}

interface Complaint {
  id: number;
  title: string;
  description: string;
  status: string;
  created_at: string;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  
  // Warga specific states
  const [familyCount, setFamilyCount] = useState(0);
  const [myLettersCount, setMyLettersCount] = useState(0);
  const [myComplaintsCount, setMyComplaintsCount] = useState(0);
  const [wargaFinance, setWargaFinance] = useState({ income: 0, expense: 0, balance: 0 });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isAdmin = user?.role === 'Admin RT' || user?.role === 'Admin RW';

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(num);
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError('');
      try {
        if (isAdmin) {
          // Fetch admin statistics
          const [statsRes, announcementsRes, complaintsRes] = await Promise.all([
            api.get('/api/stats'),
            api.get('/api/announcements'),
            api.get('/api/complaints')
          ]);
          setStats(statsRes.data);
          setAnnouncements(Array.isArray(announcementsRes.data) ? announcementsRes.data.slice(0, 3) : []);
          setComplaints(Array.isArray(complaintsRes.data) ? complaintsRes.data.slice(0, 3) : []);
        } else {
          // Fetch warga personal statistics
          const [familyRes, lettersRes, complaintsRes, financeRes, announcementsRes] = await Promise.all([
            api.get('/api/my-family'),
            api.get('/api/letters'),
            api.get('/api/complaints'),
            api.get('/api/finance/summary'),
            api.get('/api/announcements')
          ]);
          
          setFamilyCount(Array.isArray(familyRes.data) ? familyRes.data.length : 0);
          setMyLettersCount(Array.isArray(lettersRes.data) ? lettersRes.data.length : 0);
          setMyComplaintsCount(Array.isArray(complaintsRes.data) ? complaintsRes.data.length : 0);
          setWargaFinance({
            income: financeRes.data.total_income || 0,
            expense: financeRes.data.total_expense || 0,
            balance: financeRes.data.balance || 0
          });
          setAnnouncements(Array.isArray(announcementsRes.data) ? announcementsRes.data.slice(0, 3) : []);
          setComplaints(Array.isArray(complaintsRes.data) ? complaintsRes.data.slice(0, 3) : []);
        }
      } catch (err: any) {
        setError('Gagal memuat data dasbor dari server');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, isAdmin]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-[60vh]">
          <p className="text-gray-500 font-bold text-lg animate-pulse">Memuat data dasbor...</p>
        </div>
      </DashboardLayout>
    );
  }

  // Calculate percentage of finance split
  const incomeTotal = isAdmin ? (stats?.total_income || 0) : wargaFinance.income;
  const expenseTotal = isAdmin ? (stats?.total_expense || 0) : wargaFinance.expense;
  const totalFlow = incomeTotal + expenseTotal;
  const incomePercentage = totalFlow > 0 ? Math.round((incomeTotal / totalFlow) * 100) : 50;
  const expensePercentage = totalFlow > 0 ? Math.round((expenseTotal / totalFlow) * 100) : 50;

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Ringkasan Dasbor</h1>
        <p className="text-gray-500 text-sm">
          Selamat datang kembali, <strong className="text-gray-700 font-semibold">{user?.username}</strong> ({user?.role})
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 border border-red-100">
          {error}
        </div>
      )}

      {/* Grid Status Ringkasan */}
      {isAdmin ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Card Total Warga */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="p-4 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Penduduk</p>
              <h3 className="text-2xl font-extrabold text-gray-800 mt-1">{stats?.total_residents || 0} Warga</h3>
            </div>
          </div>

          {/* Card Total KK */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="p-4 bg-indigo-50 text-indigo-600 rounded-xl">
              <Home className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Kepala Keluarga</p>
              <h3 className="text-2xl font-extrabold text-gray-800 mt-1">{stats?.total_families || 0} KK</h3>
            </div>
          </div>

          {/* Card Surat Pending */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="p-4 bg-amber-50 text-amber-600 rounded-xl">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Surat Pending</p>
              <h3 className="text-2xl font-extrabold text-gray-800 mt-1">{stats?.pending_letters || 0} Permintaan</h3>
            </div>
          </div>

          {/* Card Pengaduan Aktif */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="p-4 bg-red-50 text-red-600 rounded-xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Aduan Masalah</p>
              <h3 className="text-2xl font-extrabold text-gray-800 mt-1">{stats?.active_complaints || 0} Kasus</h3>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Card Anggota Keluarga */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="p-4 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Anggota Keluarga</p>
              <h3 className="text-2xl font-extrabold text-gray-800 mt-1">{familyCount} Jiwa</h3>
            </div>
          </div>

          {/* Card Surat Saya */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="p-4 bg-amber-50 text-amber-600 rounded-xl">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pengajuan Surat</p>
              <h3 className="text-2xl font-extrabold text-gray-800 mt-1">{myLettersCount} Surat</h3>
            </div>
          </div>

          {/* Card Aduan Saya */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="p-4 bg-red-50 text-red-600 rounded-xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Aduan Saya</p>
              <h3 className="text-2xl font-extrabold text-gray-800 mt-1">{myComplaintsCount} Laporan</h3>
            </div>
          </div>

          {/* Card Saldo Kas */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="p-4 bg-green-50 text-green-600 rounded-xl">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Saldo Kas RT/RW</p>
              <h3 className="text-lg font-extrabold text-gray-800 mt-1 truncate">{formatRupiah(wargaFinance.balance)}</h3>
            </div>
          </div>
        </div>
      )}

      {/* Rencana Keuangan */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-gray-500" />
          Status Keuangan Kas RT / RW
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div>
            <p className="text-sm text-gray-400 font-medium">Total Kas Terkumpul</p>
            <h3 className="text-3xl font-black text-blue-600 mt-1">
              {formatRupiah(isAdmin ? (stats?.current_balance || 0) : wargaFinance.balance)}
            </h3>
            <p className="text-xs text-gray-400 mt-2">Menunjukkan sisa anggaran bersih kas saat ini.</p>
          </div>
          
          <div className="md:col-span-2 space-y-4">
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-green-50 text-green-600 rounded-lg"><ArrowUpRight className="w-4 h-4" /></span>
                <div>
                  <span className="text-xs text-gray-400 block">Total Pemasukan</span>
                  <strong className="text-gray-800 font-bold">{formatRupiah(incomeTotal)}</strong>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-red-50 text-red-600 rounded-lg"><ArrowDownRight className="w-4 h-4" /></span>
                <div>
                  <span className="text-xs text-gray-400 block">Total Pengeluaran</span>
                  <strong className="text-gray-800 font-bold">{formatRupiah(expenseTotal)}</strong>
                </div>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex">
              <div 
                className="bg-green-500 h-full transition-all duration-500" 
                style={{ width: `${incomePercentage}%` }}
                title={`Pemasukan: ${incomePercentage}%`}
              ></div>
              <div 
                className="bg-red-500 h-full transition-all duration-500" 
                style={{ width: `${expensePercentage}%` }}
                title={`Pengeluaran: ${expensePercentage}%`}
              ></div>
            </div>
            <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              <span>Pemasukan ({incomePercentage}%)</span>
              <span>Pengeluaran ({expensePercentage}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Pengumuman dan Pengaduan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Kolom Kiri: Pengumuman Terbaru */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-gray-500" />
              Pengumuman Terbaru
            </h2>
            <Link to="/admin/announcements" className="text-xs font-bold text-blue-600 hover:underline">
              Lihat Semua
            </Link>
          </div>

          {announcements.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">Belum ada info pengumuman terbaru.</p>
          ) : (
            <div className="space-y-4">
              {announcements.map((item) => (
                <div key={item.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                      {item.level}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : ''}
                    </span>
                  </div>
                  <h4 className="font-bold text-gray-800 text-sm mb-1">{item.title}</h4>
                  <p className="text-gray-500 text-xs line-clamp-2 leading-relaxed">{item.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Kolom Kanan: Pengaduan Terkini */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-gray-500" />
              Laporan Pengaduan Terkini
            </h2>
            <Link to="/admin/complaints" className="text-xs font-bold text-blue-600 hover:underline">
              Lihat Semua
            </Link>
          </div>

          {complaints.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">Belum ada laporan pengaduan masuk.</p>
          ) : (
            <div className="space-y-4">
              {complaints.map((item) => (
                <div key={item.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded ${
                      item.status === 'Selesai' ? 'bg-green-100 text-green-700' :
                      item.status === 'Diproses' ? 'bg-purple-100 text-purple-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {item.status}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : ''}
                    </span>
                  </div>
                  <h4 className="font-bold text-gray-800 text-sm mb-1">{item.title}</h4>
                  <p className="text-gray-500 text-xs line-clamp-2 leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
