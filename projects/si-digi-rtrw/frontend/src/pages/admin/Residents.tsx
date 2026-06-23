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

const statusColors: Record<string, string> = {
  'Tetap': 'bg-green-100 text-green-700',
  'Pindahan': 'bg-blue-100 text-blue-700',
  'Kontrak': 'bg-amber-100 text-amber-700',
};

const Residents: React.FC = () => {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newNik, setNewNik] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newDateOfBirth, setNewDateOfBirth] = useState('');
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
    if (!newNik || !newFullName || !newDateOfBirth || !newAddress) {
      alert('Mohon isi semua data wajib');
      return;
    }

    if (!/^\d{16}$/.test(newNik)) {
      alert('NIK harus berupa 16 digit angka');
      return;
    }

    const familyIdNum = parseInt(newFamilyId);
    if (isNaN(familyIdNum) || familyIdNum <= 0) {
      alert('ID Keluarga harus bernilai positif');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/api/rt/residents', {
        nik: newNik,
        full_name: newFullName,
        address: newAddress,
        status: newStatus,
        family_id: familyIdNum,
        date_of_birth: new Date(newDateOfBirth).toISOString(),
      });
      
      setIsModalOpen(false);
      // Clear form
      setNewNik('');
      setNewFullName('');
      setNewDateOfBirth('');
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
          className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20"
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
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm"
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
                      statusColors[res.status] || 'bg-gray-100 text-gray-700'
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
                <label htmlFor="newNik" className="block text-xs font-bold text-gray-500 uppercase mb-1">NIK (Nomor Induk Kependudukan)</label>
                <input
                  id="newNik"
                  name="newNik"
                  type="text"
                  required
                  value={newNik}
                  onChange={(e) => setNewNik(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-primary"
                  placeholder="Contoh: 320101XXXXXXXXXX"
                />
              </div>
              <div>
                <label htmlFor="newFullName" className="block text-xs font-bold text-gray-500 uppercase mb-1">Nama Lengkap</label>
                <input
                  id="newFullName"
                  name="newFullName"
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-primary"
                  placeholder="Masukkan nama lengkap"
                />
              </div>
              <div>
                <label htmlFor="newDateOfBirth" className="block text-xs font-bold text-gray-500 uppercase mb-1">Tanggal Lahir</label>
                <input
                  id="newDateOfBirth"
                  name="newDateOfBirth"
                  type="date"
                  required
                  value={newDateOfBirth}
                  onChange={(e) => setNewDateOfBirth(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-primary"
                />
              </div>
              <div>
                <label htmlFor="newAddress" className="block text-xs font-bold text-gray-500 uppercase mb-1">Alamat Rumah</label>
                <input
                  id="newAddress"
                  name="newAddress"
                  type="text"
                  required
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-primary"
                  placeholder="Contoh: Blok A No. 12"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="newStatus" className="block text-xs font-bold text-gray-500 uppercase mb-1">Status Tinggal</label>
                  <select
                    id="newStatus"
                    name="newStatus"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-primary bg-white"
                  >
                    <option value="Tetap">Tetap</option>
                    <option value="Pindahan">Pindahan</option>
                    <option value="Kontrak">Kontrak</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="newFamilyId" className="block text-xs font-bold text-gray-500 uppercase mb-1">ID Keluarga (KK)</label>
                  <input
                    id="newFamilyId"
                    name="newFamilyId"
                    type="number"
                    required
                    value={newFamilyId}
                    onChange={(e) => setNewFamilyId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-primary"
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

export default Residents;
