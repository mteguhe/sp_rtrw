import React from 'react';
import DashboardLayout from '../../components/DashboardLayout';

const Finance: React.FC = () => {
  return (
    <DashboardLayout>
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Keuangan Kas</h1>
        <p className="text-gray-500">Halaman rekap keuangan RT/RW</p>
      </div>
    </DashboardLayout>
  );
};

export default Finance;
