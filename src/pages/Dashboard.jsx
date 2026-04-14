import React, { useState, useEffect } from 'react';
import { Activity, Database, Users, RefreshCw, UserPlus, Filter, Trash2 } from 'lucide-react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const Dashboard = () => {
  const { t } = useTranslation();
  const [leases, setLeases] = useState([]);
  const [subnets, setSubnets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restarting, setRestarting] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [activePool, setActivePool] = useState(localStorage.getItem('activeDashboardPool') || 'All');

  useEffect(() => {
    localStorage.setItem('activeDashboardPool', activePool);
  }, [activePool]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [leasesRes, configRes] = await Promise.all([
        axios.get('/api/leases'),
        axios.get('/api/config')
      ]);
      setLeases(leasesRes.data);
      setSubnets(configRes.data.subnets);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const deleteLease = async (ip) => {
    if (!confirm(t('dashboard.confirm_delete_lease', { ip }))) return;
    try {
      await axios.delete(`/api/leases/${ip}`);
      fetchData();
    } catch (err) {
      alert(t('common.error'));
    }
  };

  const convertToReservation = async (lease) => {
    const name = lease['client-hostname'] || `host-${lease.ip.replace(/\./g, '-')}`;
    if (!confirm(t('dashboard.confirm_convert', { name }))) return;
    
    try {
      await axios.post('/api/hosts', {
        id: name,
        name: name,
        hardware: lease['hardware ethernet'],
        address: lease.ip,
        hostname: lease['client-hostname']
      });
      alert(t('dashboard.convert_success'));
    } catch (err) {
      alert(t('common.error'));
    }
  };

  const restartService = async () => {
    if (!confirm(t('dashboard.confirm_restart'))) return;
    setRestarting(true);
    try {
      await axios.post('/api/restart');
      alert(t('common.success'));
    } catch (err) {
      alert(t('common.error'));
    } finally {
      setRestarting(false);
    }
  };

  const isIpInSubnet = (ip, subnet) => {
    if (activePool === 'All') return true;
    if (!ip) return false;
    const prefix = subnet.split('.').slice(0, 3).join('.');
    return ip.toString().startsWith(prefix);
  };

  const filteredByPool = leases.filter(l => activePool === 'All' || isIpInSubnet(l.ip, activePool));

  const filteredLeases = filteredByPool.filter(l => 
    (l.ip || '').includes(searchFilter) || 
    (l['client-hostname'] || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
    (l['hardware ethernet'] || '').toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="fade-in" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>{t('dashboard.title')}</h1>
        <button className="btn btn-primary" onClick={restartService} disabled={restarting}>
          <RefreshCw size={18} className={restarting ? 'spin' : ''} />
          {restarting ? t('dashboard.restarting') : t('dashboard.restart_service')}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <StatCard icon={<Users />} label={t('dashboard.active_leases')} val={leases.length} color="var(--accent-blue)" />
        <div className="card">
          <div style={{ color: 'var(--accent-green)', marginBottom: '0.5rem' }}><Activity size={24} /></div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Server Status</div>
          <div className="badge badge-green">Online</div>
        </div>
        <div className="card">
          <div style={{ color: '#a855f7', marginBottom: '0.5rem' }}><Database size={24} /></div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Config Integrity</div>
          <div className="badge badge-blue">Valid</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <button 
          className={`btn ${activePool === 'All' ? 'btn-primary' : 'btn-ghost'}`} 
          onClick={() => setActivePool('All')}
        >
          {t('dashboard.all_pools')}
        </button>
        {subnets.map(s => (
          <button 
            key={s.network}
            className={`btn ${activePool === s.network ? 'btn-primary' : 'btn-ghost'}`} 
            onClick={() => setActivePool(s.network)}
          >
            {s.network}
          </button>
        ))}
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2>{t('dashboard.current_leases')}</h2>
          <div style={{ position: 'relative', width: '250px' }}>
            <Filter size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              placeholder={t('dashboard.search_placeholder')} 
              className="input-field" 
              style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 32px', fontSize: '0.875rem' }}
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
            />
          </div>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>{t('config.ip')}</th>
                <th>{t('config.mac')}</th>
                <th>{t('config.hostname')}</th>
                <th>{t('dashboard.ends_at')}</th>
                <th>{t('dashboard.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5">{t('common.loading')}</td></tr>
              ) : filteredLeases.map((l, idx) => (
                <tr key={idx}>
                  <td><strong>{l.ip}</strong></td>
                  <td><code>{l['hardware ethernet']}</code></td>
                  <td>{l['client-hostname'] || t('dashboard.unknown')}</td>
                  <td>{new Date(l.ends).toLocaleString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-ghost" title={t('dashboard.convert_to_res')} onClick={() => convertToReservation(l)}>
                        <UserPlus size={18} />
                      </button>
                      <button className="btn btn-ghost" style={{ color: 'var(--accent-red)' }} title={t('dashboard.delete_lease')} onClick={() => deleteLease(l.ip)}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, val, color }) => (
  <div className="card">
    <div style={{ color, marginBottom: '0.5rem' }}>{icon}</div>
    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{label}</div>
    <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{val}</div>
  </div>
);

export default Dashboard;
