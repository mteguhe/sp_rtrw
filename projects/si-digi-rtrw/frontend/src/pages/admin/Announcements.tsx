import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { Plus, Search, X, Megaphone, Calendar, User as UserIcon } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

interface Announcement {
  id: number;
  title: string;
  content: string;
  level: 'Publik' | 'RW' | 'RT';
  rt?: string;
  rw?: string;
  created_at?: string;
  author?: {
    id: number;
    username: string;
    role: string;
  };
}

const levelColors: Record<string, string> = {
  'Publik': 'bg-green-100 text-green-700 border-green-200',
  'RW': 'bg-purple-100 text-purple-700 border-purple-200',
  'RT': 'bg-amber-100 text-amber-700 border-amber-200',
};

const Announcements: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newLevel, setNewLevel] = useState<'Publik' | 'RW' | 'RT'>('RT');
  const [submitting, setSubmitting] = useState(false);

  // Set default level based on user role when modal opens
  useEffect(() => {
    if (user?.role === 'Admin RW') {
      setNewLevel('RW');
    } else {
      setNewLevel('RT');
    }
  }, [user, isModalOpen]);

  const fetchAnnouncements = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/api/announcements');
      setItems(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      setError('Gagal memuat pengumuman dari server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      alert('Mohon isi judul dan konten pengumuman');
      return;
    }

    setSubmitting(true);
    try {
      const payload: Partial<Announcement> = {
        title: newTitle.trim(),
        content: newContent.trim(),
        level: user?.role === 'Admin RT' ? 'RT' : newLevel,
      };

      await api.post('/api/announcements', payload);
      
      setIsModalOpen(false);
      setNewTitle('');
      setNewContent('');
      
      fetchAnnouncements();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Gagal menambahkan pengumuman');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAnnouncements = items.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const canCreate = user?.role === 'Admin RT' || user?.role === 'Admin RW';

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Pengumuman</h1>
          <p className="text-gray-500 text-sm">Kelola informasi dan pengumuman untuk warga</p>
        </div>
        {canCreate && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold hover:opacity-90 transition-all shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-5 h-5" />
            Buat Pengumuman
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 border border-red-100">
          {error}
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="p-4 border-b border-gray-100 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari pengumuman..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none text-sm"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-gray-500 bg-white rounded-2xl border border-gray-100">
          Memuat pengumuman...
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white rounded-2xl border border-gray-100">
          Tidak ada pengumuman ditemukan.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredAnnouncements.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="flex justify-between items-start gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${levelColors[item.level] || 'bg-gray-100 text-gray-700'}`}>
                      {item.level}
                    </span>
                    {item.level === 'RT' && item.rt && (
                      <span className="text-xs text-gray-400 font-medium">RT {item.rt} / RW {item.rw}</span>
                    )}
                    {item.level === 'RW' && item.rw && (
                      <span className="text-xs text-gray-400 font-medium">RW {item.rw}</span>
                    )}
                  </div>
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <Megaphone className="w-4 h-4" />
                  </div>
                </div>

                <h3 className="text-lg font-bold text-gray-800 mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm whitespace-pre-line mb-6 leading-relaxed">
                  {item.content}
                </p>
              </div>

              <div className="border-t border-gray-50 pt-4 flex items-center justify-between text-xs text-gray-400">
                <div className="flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5" />
                  <span>Dibuat oleh: <strong className="text-gray-600 font-semibold">{item.author?.username || 'Admin'}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Announcement Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 relative">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 p-1 hover:bg-gray-100 rounded-full"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
            
            <h2 className="text-xl font-bold text-gray-800 mb-6">Buat Pengumuman Baru</h2>
            
            <form onSubmit={handleCreateAnnouncement} className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-xs font-bold text-gray-500 uppercase mb-1">Judul Pengumuman</label>
                <input
                  id="title"
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm"
                  placeholder="Contoh: Kerja Bakti Bulanan"
                />
              </div>

              <div>
                <label htmlFor="content" className="block text-xs font-bold text-gray-500 uppercase mb-1">Isi Pengumuman</label>
                <textarea
                  id="content"
                  required
                  rows={5}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm"
                  placeholder="Tulis detail pengumuman di sini..."
                />
              </div>

              {user?.role === 'Admin RW' && (
                <div>
                  <label htmlFor="level" className="block text-xs font-bold text-gray-500 uppercase mb-1">Tingkat Pengumuman</label>
                  <select
                    id="level"
                    value={newLevel}
                    onChange={(e) => setNewLevel(e.target.value as 'Publik' | 'RW')}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm"
                  >
                    <option value="RW">Hanya RW</option>
                    <option value="Publik">Publik (Seluruh Warga)</option>
                  </select>
                </div>
              )}

              {user?.role === 'Admin RT' && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tingkat Pengumuman</label>
                  <input 
                    type="text" 
                    value="RT (Otomatis)" 
                    disabled 
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 text-sm outline-none cursor-not-allowed"
                  />
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 font-bold hover:bg-gray-50 text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:opacity-90 transition-all text-sm disabled:opacity-50"
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

export default Announcements;
