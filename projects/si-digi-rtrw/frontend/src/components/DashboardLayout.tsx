import React, { type ReactNode } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Users, LogOut, DollarSign } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isResidentsActive = location.pathname === '/admin/residents';
  const isFinanceActive = location.pathname === '/admin/finance';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 font-bold">Memuat...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <p className="text-red-500 font-bold mb-4">Anda belum masuk ke sistem</p>
        <button 
          onClick={() => navigate('/login')} 
          className="bg-blue-600 text-white px-6 py-2 rounded-lg"
        >
          Menuju Halaman Login
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col justify-between">
        <div className="p-6">
          <Link to="/" className="text-xl font-extrabold text-blue-600 tracking-wider">
            SI-DIGI RT/RW
          </Link>
          
          <nav className="mt-8 space-y-2">
            <Link 
              to="/admin/residents" 
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${
                isResidentsActive 
                  ? 'text-primary bg-primary/10' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              <Users className="w-5 h-5" />
              Data Warga
            </Link>
            <Link 
              to="/admin/finance" 
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${
                isFinanceActive 
                  ? 'text-primary bg-primary/10' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              <DollarSign className="w-5 h-5" />
              Keuangan Kas
            </Link>
          </nav>
        </div>

        {/* User profile & logout */}
        <div className="p-6 border-t border-gray-100 space-y-4">
          <div>
            <p className="font-bold text-gray-800 text-sm truncate">{user.username}</p>
            <p className="text-xs text-gray-500">{user.role} {user.rt && `RT ${user.rt}`} {user.rw && `RW ${user.rw}`}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-600 py-2.5 rounded-xl text-sm font-bold hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Keluar
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-10 overflow-y-auto">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
