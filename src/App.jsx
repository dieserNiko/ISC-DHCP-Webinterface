import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Settings, LogOut, Shield, Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import Dashboard from './pages/Dashboard';
import ConfigEditor from './pages/ConfigEditor';
import Logs from './pages/Logs';
import Login from './pages/Login';

const App = () => {
  const { t, i18n } = useTranslation();
  const [user, setUser] = useState(null);
  const [activePage, setActivePage] = useState(localStorage.getItem('activePage') || 'dashboard');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    localStorage.setItem('activePage', activePage);
  }, [activePage]);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const resp = await axios.get('/api/me');
      setUser(resp.data.username);
    } catch (e) {
      setUser(null);
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post('/api/logout');
      setUser(null);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'en' ? 'de' : 'en';
    i18n.changeLanguage(nextLang);
  };

  if (checking) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)' }}>
        <div className="fade-in" style={{ color: 'var(--text-secondary)' }}>{t('common.loading')}</div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return (
    <div className="app-container">
      <div className="sidebar">
        <div className="logo">DHCP Admin</div>
        
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div 
            className={`nav-item ${activePage === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActivePage('dashboard')}
          >
            <LayoutDashboard size={20} /> {t('common.dashboard')}
          </div>
          <div 
            className={`nav-item ${activePage === 'config' ? 'active' : ''}`}
            onClick={() => setActivePage('config')}
          >
            <Settings size={20} /> {t('common.configuration')}
          </div>
          <div 
            className={`nav-item ${activePage === 'logs' ? 'active' : ''}`}
            onClick={() => setActivePage('logs')}
          >
            <Shield size={20} /> {t('common.logs')}
          </div>
        </nav>

        <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
          <div className="nav-item" onClick={toggleLanguage}>
            <Languages size={20} /> {i18n.language.toUpperCase() === 'DE' ? 'Deutsch' : 'English'}
          </div>
          <div className="nav-item" onClick={handleLogout} style={{ color: 'var(--accent-red)' }}>
            <LogOut size={20} /> {t('common.logout')}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={12} /> {t('common.logged_in_as')} {user}
          </div>
        </div>
      </div>

      <main className="main-content">
        {activePage === 'dashboard' && <Dashboard />}
        {activePage === 'config' && <ConfigEditor />}
        {activePage === 'logs' && <Logs />}
      </main>
    </div>
  );
};

export default App;
