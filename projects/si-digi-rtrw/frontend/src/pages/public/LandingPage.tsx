import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  FileText, 
  DollarSign, 
  Bell, 
  ShieldAlert, 
  HeartPulse, 
  Flame, 
  Shield, 
  PhoneCall, 
  Megaphone,
  LogIn,
  LayoutDashboard
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

interface Announcement {
  id: number;
  title: string;
  content: string;
  level: string;
  created_at: string;
}

const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
  const [errorAnnouncements, setErrorAnnouncements] = useState(false);

  useEffect(() => {
    const abortController = new AbortController();

    const fetchPublicAnnouncements = async () => {
      try {
        const { data } = await api.get('/api/public/announcements', { signal: abortController.signal });
        if (Array.isArray(data)) {
          // Sort by newest first and take maximum 3 entries
          const sorted = [...data]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 3);
          setAnnouncements(sorted);
        } else {
          setErrorAnnouncements(true);
        }
      } catch (err) {
        const errorName = err && typeof err === 'object' && 'name' in err ? (err as { name: unknown }).name : undefined;
        if (errorName !== 'CanceledError' && errorName !== 'AbortError') {
          setErrorAnnouncements(true);
        }
      } finally {
        setLoadingAnnouncements(false);
      }
    };

    fetchPublicAnnouncements();
    return () => abortController.abort();
  }, []);

  const formatShortDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col">
      {/* Header Navigasi */}
      <header className="bg-white border-b border-slate-200 py-4 px-6 md:px-12 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="bg-blue-600 text-white w-9 h-9 rounded-lg flex items-center justify-center font-extrabold text-base">
            SD
          </span>
          <span className="font-extrabold text-lg text-blue-600 tracking-tight">
            SI-DIGI RT/RW
          </span>
        </div>
        <nav className="hidden md:flex gap-8 items-center font-semibold text-sm text-slate-600">
          <a href="#hero" className="text-blue-600 hover:text-blue-700 transition-colors">Beranda</a>
          <a href="#services" className="hover:text-blue-600 transition-colors">Layanan</a>
          <a href="#stats-darurat" className="hover:text-blue-600 transition-colors">Statistik & Darurat</a>
          <a href="#pengurus-pengumuman" className="hover:text-blue-600 transition-colors">Pengurus & Info</a>
          {user ? (
            <Link
              to="/admin/residents"
              className="bg-blue-600 text-white px-5 py-2 rounded-lg font-bold text-xs hover:bg-blue-700 transition-all shadow-md shadow-blue-500/10 flex items-center gap-1.5"
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>
          ) : (
            <Link
              to="/login"
              className="bg-blue-600 text-white px-5 py-2 rounded-lg font-bold text-xs hover:bg-blue-700 transition-all shadow-md shadow-blue-500/10 flex items-center gap-1.5"
            >
              <LogIn className="w-4 h-4" />
              Masuk
            </Link>
          )}
        </nav>
      </header>

      {/* Hero Section */}
      <section
        id="hero"
        className="relative bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-16 px-6 md:px-12 border-b border-slate-100 overflow-hidden flex-shrink-0 animate-fade-in"
      >
        <div className="absolute top-[-100px] left-[-100px] w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-[-100px] right-[-100px] w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <span className="bg-blue-100 text-blue-800 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider inline-block mb-6 shadow-sm border border-blue-200/50">
            Sistem Layanan Lingkungan Digital
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 leading-tight tracking-tight mb-6">
            Sistem Informasi Digital untuk Lingkungan Modern & Transparan
          </h1>
          <p className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            Menghubungkan warga dan pengurus RT/RW dengan transparansi kas keuangan, kemudahan administrasi persuratan, dan pelaporan aduan masalah lingkungan secara real-time.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {user ? (
              <Link
                to="/admin/residents"
                className="w-full sm:w-auto bg-blue-600 text-white font-extrabold px-8 py-3.5 rounded-xl hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/20 active:scale-95 transition-all text-sm shadow-md"
              >
                Menuju Dashboard
              </Link>
            ) : (
              <Link
                to="/login"
                className="w-full sm:w-auto bg-blue-600 text-white font-extrabold px-8 py-3.5 rounded-xl hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/20 active:scale-95 transition-all text-sm shadow-md"
              >
                Masuk ke Sistem
              </Link>
            )}
            <Link
              to="/admin/complaints"
              className="w-full sm:w-auto bg-white border-2 border-slate-200 text-blue-600 font-extrabold px-8 py-3.5 rounded-xl hover:bg-slate-50 active:scale-95 transition-all text-sm shadow-sm"
            >
              Lapor RT (Pengaduan)
            </Link>
          </div>
        </div>
      </section>

      {/* Grid Layanan Utama */}
      <section id="services" className="py-16 px-6 md:px-12 max-w-7xl mx-auto w-full">
        <div className="text-center mb-12">
          <h2 className="text-xs uppercase tracking-widest font-black text-blue-600 mb-2">Layanan Warga</h2>
          <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Hub Layanan Mandiri Digital</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link
            to="/admin/residents"
            className="group bg-white border border-slate-100 hover:border-blue-500 rounded-2xl p-6 text-center hover:shadow-xl hover:shadow-blue-500/5 transition-all flex flex-col items-center"
          >
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-xl font-bold mb-4 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <h4 className="font-extrabold text-slate-800 mb-2">Data Warga</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Pengelolaan data Kartu Keluarga (KK) beserta peristiwa kependudukan lainnya.
            </p>
          </Link>

          <Link
            to="/admin/letters"
            className="group bg-white border border-slate-100 hover:border-pink-500 rounded-2xl p-6 text-center hover:shadow-xl hover:shadow-pink-500/5 transition-all flex flex-col items-center"
          >
            <div className="w-12 h-12 bg-pink-50 text-pink-600 rounded-xl flex items-center justify-center text-xl font-bold mb-4 group-hover:scale-110 transition-transform">
              <FileText className="w-6 h-6" />
            </div>
            <h4 className="font-extrabold text-slate-800 mb-2">Persuratan</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Pengajuan surat keterangan domisili atau surat pengantar RT/RW secara mandiri.
            </p>
          </Link>

          <Link
            to="/admin/finance"
            className="group bg-white border border-slate-100 hover:border-emerald-500 rounded-2xl p-6 text-center hover:shadow-xl hover:shadow-emerald-500/5 transition-all flex flex-col items-center"
          >
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center text-xl font-bold mb-4 group-hover:scale-110 transition-transform">
              <DollarSign className="w-6 h-6" />
            </div>
            <h4 className="font-extrabold text-slate-800 mb-2">Keuangan Kas</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Laporan berkala transparansi kas masuk, kas keluar, dan saldo kas RT/RW.
            </p>
          </Link>

          <Link
            to="/admin/announcements"
            className="group bg-white border border-slate-100 hover:border-amber-500 rounded-2xl p-6 text-center hover:shadow-xl hover:shadow-amber-500/5 transition-all flex flex-col items-center"
          >
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center text-xl font-bold mb-4 group-hover:scale-110 transition-transform">
              <Bell className="w-6 h-6" />
            </div>
            <h4 className="font-extrabold text-slate-800 mb-2">Pengumuman</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Berita penting, kegiatan lingkungan, sosialisasi, dan informasi aktual warga.
            </p>
          </Link>
        </div>
      </section>

      {/* Statistik & Kontak Darurat */}
      <section
        id="stats-darurat"
        className="py-16 px-6 md:px-12 bg-white border-t border-slate-200 border-b w-full"
      >
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Kiri: Statistik */}
          <div className="bg-slate-50 border border-slate-100 rounded-3xl p-8 shadow-sm">
            <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Statistik Lingkungan (RW 04)
            </h3>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4 bg-white border border-slate-100 p-4 rounded-2xl">
                <span className="text-3xl font-black text-blue-600 w-16">05</span>
                <div>
                  <h4 className="font-extrabold text-slate-800 text-sm">Rukun Tetangga (RT)</h4>
                  <p className="text-xs text-slate-500">Jumlah wilayah administratif aktif di bawah RW 04</p>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-white border border-slate-100 p-4 rounded-2xl">
                <span className="text-3xl font-black text-purple-600 w-16">230</span>
                <div>
                  <h4 className="font-extrabold text-slate-800 text-sm">Kepala Keluarga (KK)</h4>
                  <p className="text-xs text-slate-500">Keluarga terdaftar dan terverifikasi di wilayah</p>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-white border border-slate-100 p-4 rounded-2xl">
                <span className="text-3xl font-black text-emerald-600 w-16">980</span>
                <div>
                  <h4 className="font-extrabold text-slate-800 text-sm">Total Warga (Jiwa)</h4>
                  <p className="text-xs text-slate-500">Jiwa penduduk terdaftar yang berdomisili aktif</p>
                </div>
              </div>
            </div>
          </div>

          {/* Kanan: Kontak Darurat */}
          <div className="bg-slate-50 border border-slate-100 rounded-3xl p-8 shadow-sm">
            <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-600" />
              Kontak Darurat Lingkungan
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <a
                href="tel:118"
                className="bg-red-50 hover:bg-red-100 border border-red-100 hover:border-red-200 rounded-2xl p-4 flex items-center gap-4 transition-all"
              >
                <HeartPulse className="w-8 h-8 text-red-600 shrink-0" />
                <div>
                  <h4 className="font-extrabold text-red-800 text-xs uppercase tracking-wide">Ambulans / Medis</h4>
                  <p className="text-lg font-black text-red-600">118</p>
                </div>
              </a>

              <a
                href="tel:113"
                className="bg-amber-50 hover:bg-amber-100 border border-amber-100 hover:border-amber-200 rounded-2xl p-4 flex items-center gap-4 transition-all"
              >
                <Flame className="w-8 h-8 text-amber-600 shrink-0" />
                <div>
                  <h4 className="font-extrabold text-amber-800 text-xs uppercase tracking-wide">Damkar</h4>
                  <p className="text-lg font-black text-amber-600">113</p>
                </div>
              </a>

              <a
                href="tel:021123456"
                className="bg-blue-50 hover:bg-blue-100 border border-blue-100 hover:border-blue-200 rounded-2xl p-4 flex items-center gap-4 transition-all"
              >
                <Shield className="w-8 h-8 text-blue-600 shrink-0" />
                <div>
                  <h4 className="font-extrabold text-blue-800 text-xs uppercase tracking-wide">Polsek Terdekat</h4>
                  <p className="text-sm font-black text-blue-600">021-123456</p>
                </div>
              </a>

              <a
                href="tel:081234567890"
                className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 hover:border-emerald-200 rounded-2xl p-4 flex items-center gap-4 transition-all"
              >
                <PhoneCall className="w-8 h-8 text-emerald-600 shrink-0" />
                <div>
                  <h4 className="font-extrabold text-emerald-800 text-xs uppercase tracking-wide">Pos Keamanan RW</h4>
                  <p className="text-sm font-black text-emerald-600">0812-3456-7890</p>
                </div>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Pengurus & Pengumuman Publik */}
      <section id="pengurus-pengumuman" className="py-16 px-6 md:px-12 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Kiri: Pengurus RW */}
          <div>
            <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Bagan Pengurus RW Aktif
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white border border-slate-100 p-4 rounded-2xl flex items-center gap-3 shadow-sm">
                <div className="w-10 h-10 bg-slate-100 text-slate-700 rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                  HS
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-800 text-sm">Bpk. Heru Santoso</h4>
                  <p className="text-xs text-slate-500">Ketua RW</p>
                </div>
              </div>
              <div className="bg-white border border-slate-100 p-4 rounded-2xl flex items-center gap-3 shadow-sm">
                <div className="w-10 h-10 bg-slate-100 text-slate-700 rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                  RL
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-800 text-sm">Ibu Rina Lestari</h4>
                  <p className="text-xs text-slate-500">Sekretaris RW</p>
                </div>
              </div>
              <div className="bg-white border border-slate-100 p-4 rounded-2xl flex items-center gap-3 shadow-sm">
                <div className="w-10 h-10 bg-slate-100 text-slate-700 rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                  JS
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-800 text-sm">Bpk. Joko Susilo</h4>
                  <p className="text-xs text-slate-500">Bendahara RW</p>
                </div>
              </div>
              <div className="bg-white border border-slate-100 p-4 rounded-2xl flex items-center gap-3 shadow-sm">
                <div className="w-10 h-10 bg-slate-100 text-slate-700 rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                  SW
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-800 text-sm">Bpk. Slamet Wijaya</h4>
                  <p className="text-xs text-slate-500">Koord. Keamanan</p>
                </div>
              </div>
            </div>
          </div>

          {/* Kanan: Pengumuman Publik */}
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-blue-600" />
                Pengumuman Publik Terbaru
              </h3>
              <Link to="/pengumuman" className="text-xs font-bold text-blue-600 hover:text-blue-700">
                Lihat Semua
              </Link>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm min-h-[180px]">
              {loadingAnnouncements ? (
                <div className="text-slate-400 text-xs text-center py-12">Memuat pengumuman publik...</div>
              ) : errorAnnouncements ? (
                <div className="text-red-500 text-xs text-center py-12">Gagal memuat pengumuman.</div>
              ) : announcements.length === 0 ? (
                <div className="text-slate-400 text-xs text-center py-12">Belum ada pengumuman publik.</div>
              ) : (
                <div className="flex flex-col gap-4">
                  {announcements.map((item) => (
                    <div key={item.id} className="border-l-2 border-blue-600 pl-4 py-1">
                      <h4 className="font-extrabold text-slate-800 text-sm leading-snug">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {formatShortDate(item.created_at)} • oleh admin
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-slate-900 text-slate-400 py-10 px-6 text-center text-xs border-t border-slate-800">
        <p className="font-bold text-white mb-2">SI-DIGI RT/RW — Solusi Administratif Lingkungan Anda</p>
        <p className="mb-4">© 2026 Seluruh Hak Cipta Dilindungi Undang-Undang.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
