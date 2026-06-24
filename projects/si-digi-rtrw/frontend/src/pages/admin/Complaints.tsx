import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { AlertTriangle, Upload, Eye } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

type ComplaintStatus = 'Diterima' | 'Diproses' | 'Selesai';

interface Complaint {
  id: number;
  title: string;
  description: string;
  photo_url: string;
  status: ComplaintStatus;
  rt: string;
  rw: string;
  created_at: string;
  reporter?: {
    id: number;
    username: string;
    resident?: {
      full_name: string;
    };
  };
}

const statusBadge = (status: ComplaintStatus) => {
  if (status === 'Selesai') return 'bg-green-100 text-green-700';
  if (status === 'Diproses') return 'bg-purple-100 text-purple-700';
  return 'bg-amber-100 text-amber-700';
};

const Complaints: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'tab1' | 'tab2'>('tab1');
  const [actionId, setActionId] = useState<number | null>(null);

  // Form inputs
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const fetchComplaints = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/api/complaints');
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setError('Gagal memuat daftar pengaduan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [user]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhoto(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !photo) {
      alert('Mohon lengkapi formulir laporan dan sertakan foto bukti');
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('description', description.trim());
    formData.append('photo', photo);

    try {
      await api.post('/api/complaints', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setTitle('');
      setDescription('');
      setPhoto(null);
      setPreviewUrl('');
      setActiveTab('tab2');
      fetchComplaints();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Gagal mengirim pengaduan');
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (id: number, nextStatus: ComplaintStatus) => {
    setActionId(id);
    try {
      await api.put(`/api/complaints/${id}/status`, { status: nextStatus });
      fetchComplaints();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Gagal memperbarui status pengaduan');
    } finally {
      setActionId(null);
    }
  };

  const isWarga = user?.role === 'Warga';

  const getFilteredComplaints = () => {
    if (isWarga) {
      return items;
    }
    // Admin RT / RW
    if (activeTab === 'tab1') {
      return items.filter((item) => item.status === 'Diterima' || item.status === 'Diproses');
    } else {
      return items.filter((item) => item.status === 'Selesai');
    }
  };

  const filtered = getFilteredComplaints();

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Laporan Pengaduan Warga</h1>
        <p className="text-gray-500 text-sm">
          {isWarga
            ? 'Tulis pengaduan mengenai masalah lingkungan Anda secara transparan'
            : 'Verifikasi dan tindak lanjuti laporan pengaduan dari warga'}
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
          {isWarga ? 'Buat Pengaduan' : 'Antrean Pengaduan'}
        </button>
        <button
          onClick={() => setActiveTab('tab2')}
          className={`pb-3 font-bold text-sm border-b-2 px-2 transition-colors ${
            activeTab === 'tab2'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          {isWarga ? 'Daftar Pengaduan Lingkungan' : 'Arsip Selesai'}
        </button>
      </div>

      {/* Tab Contents */}
      {isWarga && activeTab === 'tab1' ? (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm max-w-lg">
          <h2 className="text-lg font-bold text-gray-800 mb-6">Formulir Laporan Baru</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Judul Laporan</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Lampu Jalan Padam di Blok B"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Deskripsi Masalah</label>
              <textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Jelaskan detail lokasi dan kronologi permasalahan..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-blue-500 h-28 resize-none text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Foto Bukti Fisik (Wajib)</label>
              <div className="mt-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-colors relative">
                <input
                  type="file"
                  required
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <p className="text-xs text-gray-500 font-medium">Klik atau tarik foto ke sini untuk memilih file</p>
                <p className="text-[10px] text-gray-400 mt-1">Hanya JPG, JPEG, PNG (Maks 5MB)</p>
              </div>
              {previewUrl && (
                <div className="mt-4">
                  <p className="text-xs font-bold text-gray-500 mb-2">Pratinjau Foto:</p>
                  <img src={previewUrl} alt="Preview" className="w-full h-40 object-cover rounded-xl border" />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all text-sm shadow-md"
            >
              {submitting ? 'Mengunggah Laporan...' : 'Kirim Pengaduan'}
            </button>
          </form>
        </div>
      ) : (
        <div>
          {loading ? (
            <div className="p-8 text-center text-gray-500 bg-white rounded-2xl border">Memuat data...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-500 bg-white rounded-2xl border">
              Belum ada laporan pengaduan saat ini.
            </div>
          ) : isWarga ? (
            /* Warga Card Feed Layout */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filtered.map((item) => (
                <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                  <img
                    src={api.defaults.baseURL + item.photo_url}
                    alt={item.title}
                    className="w-full h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setSelectedPhoto(api.defaults.baseURL + item.photo_url)}
                  />
                  <div className="p-6 flex-1 flex flex-col justify-between gap-4">
                    <div>
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <h3 className="font-bold text-gray-800 text-base flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                          {item.title}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold shrink-0 uppercase ${statusBadge(item.status)}`}>
                          {item.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-3">{item.description}</p>
                    </div>
                    <div className="text-[11px] text-gray-400 border-t pt-3 flex justify-between items-center">
                      <span>Pelapor: {item.reporter?.resident?.full_name || item.reporter?.username} (RT {item.rt})</span>
                      <span>{item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Admin Work Table Layout */
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider font-bold">
                    <th className="px-6 py-4">Laporan</th>
                    <th className="px-6 py-4">Detail</th>
                    <th className="px-6 py-4">Foto Bukti</th>
                    <th className="px-6 py-4">Pelapor & Wilayah</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-800 text-sm">{item.title}</div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID') : ''}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{item.description}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setSelectedPhoto(api.defaults.baseURL + item.photo_url)}
                          className="flex items-center gap-1.5 px-2.5 py-1 border rounded-lg text-xs font-bold text-blue-600 hover:bg-blue-50"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Lihat Foto
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {item.reporter?.resident?.full_name || item.reporter?.username}
                        <div className="text-xs text-gray-400">RT {item.rt} / RW {item.rw}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadge(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {item.status === 'Diterima' && (
                            <button
                              onClick={() => updateStatus(item.id, 'Diproses')}
                              disabled={actionId === item.id}
                              className="px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 disabled:opacity-50"
                            >
                              Proses
                            </button>
                          )}
                          {(item.status === 'Diterima' || item.status === 'Diproses') && (
                            <button
                              onClick={() => updateStatus(item.id, 'Selesai')}
                              disabled={actionId === item.id}
                              className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700 disabled:opacity-50"
                            >
                              Selesaikan
                            </button>
                          )}
                          {item.status === 'Selesai' && <span className="text-xs text-gray-400">Terselesaikan</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Photo View Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" onClick={() => setSelectedPhoto(null)}>
          <div className="relative max-w-3xl w-full bg-white rounded-2xl overflow-hidden p-2" onClick={(e) => e.stopPropagation()}>
            <img src={selectedPhoto} alt="Zoomed view" className="w-full max-h-[80vh] object-contain rounded-xl" />
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute right-4 top-4 bg-black/60 hover:bg-black/80 text-white px-3 py-1 rounded-full text-xs font-bold"
            >
              Tutup [X]
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Complaints;
