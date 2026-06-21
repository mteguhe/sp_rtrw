import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Home, Users, FileText, Bell, ShieldAlert } from 'lucide-react';
import Login from './pages/Login';
import Residents from './pages/admin/Residents';

const LandingPage = () => (
  <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
    <div className="max-w-4xl w-full text-center space-y-8">
      <h1 className="text-5xl font-extrabold text-primary">SI-DIGI RT/RW</h1>
      <p className="text-xl text-secondary">Sistem Informasi Digital untuk Lingkungan yang Lebih Modern & Transparan</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <Users className="w-12 h-12 text-primary mx-auto mb-4" />
          <h3 className="font-bold text-lg">Data Warga</h3>
          <p className="text-sm text-gray-500">Kelola data KK & anggota keluarga</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <FileText className="w-12 h-12 text-primary mx-auto mb-4" />
          <h3 className="font-bold text-lg">E-Surat</h3>
          <p className="text-sm text-gray-500">Ajukan surat domisili & pengantar</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <Bell className="w-12 h-12 text-primary mx-auto mb-4" />
          <h3 className="font-bold text-lg">Pengumuman</h3>
          <p className="text-sm text-gray-500">Info penting dari RT & RW</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <ShieldAlert className="w-12 h-12 text-primary mx-auto mb-4" />
          <h3 className="font-bold text-lg">Lapor RT</h3>
          <p className="text-sm text-gray-500">Aduan masalah lingkungan</p>
        </div>
      </div>

      <div className="flex gap-4 justify-center mt-12">
        <Link to="/login" className="bg-primary text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-primary/20">
          Masuk ke Sistem
        </Link>
        <button className="border border-primary text-primary px-8 py-3 rounded-lg font-bold hover:bg-blue-50 transition-colors">
          Informasi Publik
        </button>
      </div>
    </div>
  </div>
);

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin/residents" element={<Residents />} />
      </Routes>
    </Router>
  );
};

export default App;
