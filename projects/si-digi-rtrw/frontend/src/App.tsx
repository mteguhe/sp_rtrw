import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Residents from './pages/admin/Residents';
import Finance from './pages/admin/Finance';
import Announcements from './pages/admin/Announcements';
import Letters from './pages/admin/Letters';
import Complaints from './pages/admin/Complaints';
import PublicAnnouncements from './pages/public/PublicAnnouncements';
import LandingPage from './pages/public/LandingPage';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin/residents" element={<Residents />} />
        <Route path="/admin/finance" element={<Finance />} />
        <Route path="/admin/announcements" element={<Announcements />} />
        <Route path="/admin/letters" element={<Letters />} />
        <Route path="/admin/complaints" element={<Complaints />} />
        <Route path="/pengumuman" element={<PublicAnnouncements />} />
      </Routes>
    </Router>
  );
};

export default App;
