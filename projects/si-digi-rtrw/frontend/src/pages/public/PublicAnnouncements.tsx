import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Megaphone, ChevronRight } from 'lucide-react';
import api from '../../services/api';

interface Announcement {
  id: number;
  title: string;
  content: string;
  level: 'Publik' | 'RW' | 'RT';
  rt?: string;
  rw?: string;
  created_at?: string;
}

const PublicAnnouncements: React.FC = () => {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAnnouncements = async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/api/public/announcements');
        setItems(Array.isArray(data) ? data : []);
      } catch {
        setError('Gagal memuat pengumuman publik');
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
            <Link to="/" className="hover:text-primary">Beranda</Link>
            <ChevronRight className="w-4 h-4" />
            <span>Pengumuman Publik</span>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900">Pengumuman Publik</h1>
          <p className="text-gray-500 mt-2">
            Informasi penting yang disebarkan untuk seluruh warga.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 border border-red-100">
            {error}
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center text-gray-500 bg-white rounded-2xl shadow-sm border border-gray-100">
            Memuat pengumuman...
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-gray-500 bg-white rounded-2xl shadow-sm border border-gray-100">
            Belum ada pengumuman publik saat ini.
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-xl text-primary">
                      <Megaphone className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{item.title}</h3>
                      <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{item.content}</p>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-400 mt-4">
                  {item.created_at ? new Date(item.created_at).toLocaleString('id-ID') : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicAnnouncements;
