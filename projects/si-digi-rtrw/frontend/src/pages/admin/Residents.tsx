import React from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';

const Residents: React.FC = () => {
  // Mock data
  const residents = [
    { id: 1, name: 'Budi Santoso', nik: '3201010101010001', address: 'Blok A No. 12', status: 'Tetap' },
    { id: 2, name: 'Siti Aminah', nik: '3201010101010002', address: 'Blok A No. 12', status: 'Tetap' },
    { id: 3, name: 'Agus Setiawan', nik: '3201010101010003', address: 'Blok B No. 05', status: 'Pindahan' },
  ];

  return (
    <DashboardLayout role="Admin RT">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Manajemen Warga</h1>
          <p className="text-gray-500 text-sm">Kelola data penduduk di lingkungan RT 01</p>
        </div>
        <button className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold hover:bg-blue-700 transition-all shadow-lg shadow-primary/20">
          <Plus className="w-5 h-5" />
          Tambah Warga
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari berdasarkan nama atau NIK..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm"
            />
          </div>
        </div>

        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider font-bold">
              <th className="px-6 py-4">Nama Lengkap</th>
              <th className="px-6 py-4">NIK</th>
              <th className="px-6 py-4">Alamat</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {residents.map((res) => (
              <tr key={res.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-medium text-gray-800">{res.name}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{res.nik}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{res.address}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                    res.status === 'Tetap' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {res.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-center gap-2">
                    <button className="p-1 hover:bg-blue-50 text-blue-600 rounded">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button className="p-1 hover:bg-red-50 text-red-600 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
};

export default Residents;
