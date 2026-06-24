import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { FileText } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

type LetterStatus = 'Menunggu RT' | 'Menunggu RW' | 'Selesai' | 'Ditolak';

interface Resident {
  id: number;
  full_name: string;
  nik: string;
}

interface Letter {
  id: number;
  type: string;
  purpose: string;
  validity: string;
  status: LetterStatus;
  pdf_url: string;
  rt?: string;
  rw?: string;
  created_at?: string;
  applicant?: {
    id: number;
    username: string;
    role: string;
  };
  subject?: {
    id: number;
    full_name: string;
    nik: string;
  };
}

const statusBadge = (status: LetterStatus) => {
  if (status === 'Selesai') return 'bg-green-100 text-green-700';
  if (status === 'Ditolak') return 'bg-red-100 text-red-700';
  if (status === 'Menunggu RW') return 'bg-purple-100 text-purple-700';
  return 'bg-amber-100 text-amber-700';
};

const Letters: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Letter[]>([]);
  const [familyMembers, setFamilyMembers] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'tab1' | 'tab2'>('tab1');
  const [actionId, setActionId] = useState<number | null>(null);

  // Form inputs
  const [subjectId, setSubjectId] = useState('');
  const [type, setType] = useState('Surat Domisili');
  const [validity, setValidity] = useState('1 Bulan');
  const [purpose, setPurpose] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [lettersRes, familyRes] = await Promise.all([
        api.get('/api/letters'),
        user?.role === 'Warga' ? api.get('/api/my-family') : Promise.resolve({ data: [] })
      ]);
      setItems(Array.isArray(lettersRes.data) ? lettersRes.data : []);
      setFamilyMembers(Array.isArray(familyRes.data) ? familyRes.data : []);
      if (familyRes.data.length > 0) {
        setSubjectId(String(familyRes.data[0].id));
      }
    } catch {
      setError('Gagal memuat data dari server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId || !purpose.trim() || purpose.trim().length < 10) {
      alert('Mohon lengkapi formulir (keperluan minimal 10 karakter)');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/api/letters', {
        type,
        subject_id: parseInt(subjectId),
        purpose: purpose.trim(),
        validity
      });
      setPurpose('');
      setActiveTab('tab2');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Gagal mengirim pengajuan surat');
    } finally {
      setSubmitting(false);
    }
  };

  const approve = async (id: number) => {
    setActionId(id);
    try {
      await api.post(`/api/letters/${id}/approve`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Gagal menyetujui surat');
    } finally {
      setActionId(null);
    }
  };

  const reject = async (id: number) => {
    if (!window.confirm('Tolak permohonan surat ini?')) return;
    setActionId(id);
    try {
      await api.post(`/api/letters/${id}/reject`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Gagal menolak surat');
    } finally {
      setActionId(null);
    }
  };

  const isWarga = user?.role === 'Warga';

  const getFilteredLetters = () => {
    if (isWarga) {
      return items;
    }
    // Admins: tab1 is approval queue, tab2 is history archive
    if (activeTab === 'tab1') {
      return items.filter(
        (item) =>
          (user?.role === 'Admin RT' && item.status === 'Menunggu RT') ||
          (user?.role === 'Admin RW' && item.status === 'Menunggu RW')
      );
    } else {
      return items.filter((item) => item.status === 'Selesai' || item.status === 'Ditolak');
    }
  };

  const filtered = getFilteredLetters();

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Permohonan Surat</h1>
        <p className="text-gray-500 text-sm">
          {isWarga
            ? 'Ajukan surat keterangan digital dan lihat riwayat pengajuan Anda'
            : 'Kelola verifikasi persetujuan surat resmi warga'}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 border border-red-100">
          {error}
        </div>
      )}

      {/* Tab Headers */}
      <div className="flex gap-4 border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('tab1')}
          className={`pb-3 font-bold text-sm border-b-2 px-2 transition-colors ${
            activeTab === 'tab1'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          {isWarga ? 'Buat Pengajuan' : 'Antrean Persetujuan'}
        </button>
        <button
          onClick={() => setActiveTab('tab2')}
          className={`pb-3 font-bold text-sm border-b-2 px-2 transition-colors ${
            activeTab === 'tab2'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          {isWarga ? 'Riwayat Pengajuan' : 'Arsip Riwayat'}
        </button>
      </div>

      {/* Tab Contents */}
      {isWarga && activeTab === 'tab1' ? (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm max-w-lg">
          <h2 className="text-lg font-bold text-gray-800 mb-6">Formulir Pengajuan Surat Baru</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Subjek Surat (Anggota Keluarga)</label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-blue-500 bg-white text-sm"
              >
                {familyMembers.map((m) => (
                  <option key={m.id} value={String(m.id)}>
                    {m.full_name} ({m.nik})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Jenis Surat</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-blue-500 bg-white text-sm"
                >
                  <option value="Surat Domisili">Surat Domisili</option>
                  <option value="Surat Keterangan Pengantar">Surat Keterangan Pengantar</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Masa Berlaku</label>
                <select
                  value={validity}
                  onChange={(e) => setValidity(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-blue-500 bg-white text-sm"
                >
                  <option value="1 Bulan">1 Bulan</option>
                  <option value="3 Bulan">3 Bulan</option>
                  <option value="6 Bulan">6 Bulan</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Keperluan Pengajuan</label>
              <textarea
                required
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-blue-500 h-24 resize-none text-sm"
                placeholder="Contoh: Urus Paspor Baru, Lamaran Pekerjaan, dll"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || familyMembers.length === 0}
              className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all text-sm shadow-md shadow-blue-500/10"
            >
              {submitting ? 'Mengirim...' : 'Kirim Pengajuan'}
            </button>
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Memuat data...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {isWarga ? 'Anda belum memiliki riwayat pengajuan surat.' : 'Antrean persetujuan kosong.'}
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider font-bold">
                  <th className="px-6 py-4">Jenis Surat</th>
                  <th className="px-6 py-4">Keperluan</th>
                  <th className="px-6 py-4">Subjek Surat</th>
                  <th className="px-6 py-4">RT / RW</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-800 font-medium">
                        <FileText className="w-4 h-4 text-blue-600" />
                        {item.type}
                      </div>
                      {item.validity && (
                        <div className="text-xs text-gray-400 mt-1">Berlaku: {item.validity}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.purpose}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {item.subject?.full_name || 'Tidak diketahui'}
                      <div className="text-xs text-gray-400">{item.subject?.nik ? `NIK: ${item.subject.nik}` : ''}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      RT {item.rt || '-'} / RW {item.rw || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadge(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {isWarga ? (
                          item.status === 'Selesai' && item.pdf_url ? (
                            <a
                              href={api.defaults.baseURL + item.pdf_url}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-bold hover:bg-blue-100"
                            >
                              Unduh PDF
                            </a>
                          ) : (
                            <span className="text-xs text-gray-400">Diproses</span>
                          )
                        ) : (
                          <>
                            {item.status === 'Menunggu RT' && user?.role === 'Admin RT' && (
                              <>
                                <button
                                  onClick={() => approve(item.id)}
                                  disabled={actionId === item.id}
                                  className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700 disabled:opacity-50"
                                >
                                  Setujui
                                </button>
                                <button
                                  onClick={() => reject(item.id)}
                                  disabled={actionId === item.id}
                                  className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 disabled:opacity-50"
                                >
                                  Tolak
                                </button>
                              </>
                            )}
                            {item.status === 'Menunggu RW' && user?.role === 'Admin RW' && (
                              <>
                                <button
                                  onClick={() => approve(item.id)}
                                  disabled={actionId === item.id}
                                  className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700 disabled:opacity-50"
                                >
                                  Finalkan
                                </button>
                                <button
                                  onClick={() => reject(item.id)}
                                  disabled={actionId === item.id}
                                  className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 disabled:opacity-50"
                                >
                                  Tolak
                                </button>
                              </>
                            )}
                            {(item.status === 'Selesai' || item.status === 'Ditolak') && (
                              <span className="text-xs text-gray-400">Selesai</span>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </DashboardLayout>
  );
};

export default Letters;
