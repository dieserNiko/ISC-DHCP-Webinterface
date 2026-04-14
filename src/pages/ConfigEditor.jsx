import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Save, X, Wifi, Cpu, Settings, Globe, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const ConfigEditor = () => {
  const { t } = useTranslation();
  const [config, setConfig] = useState({ subnets: [], hosts: [], globals: [] });
  const [activeTab, setActiveTab] = useState(localStorage.getItem('activeConfigTab') || 'subnets');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [activePoolFilter, setActivePoolFilter] = useState('All');

  useEffect(() => {
    localStorage.setItem('activeConfigTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/config');
      setConfig(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (type, item = null) => {
    setEditingItem(item ? { ...item, _type: type } : { _type: type });
    setFormData(item || getEmptyEntity(type));
    setShowModal(true);
  };

  const getEmptyEntity = (type) => {
    if (type === 'host') return { name: '', hardware: '', address: '', hostname: '' };
    if (type === 'subnet') return { network: '', netmask: '', pools: [{ start: '', end: '', options: [] }], options: [] };
    return {};
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    const type = editingItem._type;
    const endpoint = type === 'host' ? '/api/hosts' : '/api/subnets';
    
    try {
      if (editingItem.id || editingItem.network) {
        // Edit mode (assuming the API supports PUT or identifies by ID in POST)
        // For simplicity based on original logic, we use POST for both or have specific logic
        await axios.post(endpoint, formData);
      } else {
        await axios.post(endpoint, formData);
      }
      setShowModal(false);
      fetchConfig();
    } catch (err) {
      alert(t('common.error') + ': ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const saveGlobals = async () => {
    setSaving(true);
    try {
      await axios.post('/api/globals', { globals: config.globals });
      alert(t('common.success'));
    } catch (err) {
      alert(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (type, id) => {
    if (!confirm(t('config.confirm_delete'))) return;
    const endpoint = type === 'host' ? `/api/hosts/${id}` : `/api/subnets/${id}`;
    try {
      await axios.delete(endpoint);
      fetchConfig();
    } catch (err) {
      alert(t('common.error'));
    }
  };

  const isIpInSubnet = (ip, subnet) => {
    if (activePoolFilter === 'All') return true;
    if (!ip) return false;
    const prefix = subnet.split('.').slice(0, 3).join('.');
    return ip.toString().startsWith(prefix);
  };

  const filteredHosts = config.hosts.filter(h => {
    const matchesSearch = 
      (h.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (h.address || '').includes(searchTerm) ||
      (h.hardware || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (h.hostname || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPool = activePoolFilter === 'All' || isIpInSubnet(h.address, activePoolFilter);
    return matchesSearch && matchesPool;
  });

  const filteredSubnets = config.subnets.filter(s => 
    s.network.includes(searchTerm)
  );

  return (
    <div className="fade-in" style={{ padding: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2.5rem', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 600, margin: 0 }}>{t('config.title')}</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>DHCP Server Settings & Reservations</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.25rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <TabBtn active={activeTab === 'subnets'} onClick={() => setActiveTab('subnets')} icon={<Wifi size={18} />} label={t('config.subnets')} />
          <TabBtn active={activeTab === 'hosts'} onClick={() => setActiveTab('hosts')} icon={<Cpu size={18} />} label={t('config.hosts')} />
          <TabBtn active={activeTab === 'globals'} onClick={() => setActiveTab('globals')} icon={<Globe size={18} />} label={t('config.globals')} />
        </div>
      </header>

      {activeTab === 'subnets' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
            <h2>{t('config.subnet_pools')}</h2>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ position: 'relative', width: '250px' }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input type="text" placeholder={t('common.search')} className="input-field" style={{ paddingLeft: '32px' }} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              <button className="btn btn-primary" onClick={() => openModal('subnet')}><Plus size={18} /> {t('config.add_subnet')}</button>
            </div>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>{t('config.network')}</th>
                  <th>{t('config.netmask')}</th>
                  <th>{t('config.pools')}</th>
                  <th>{t('config.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="4">{t('common.loading')}</td></tr>
                ) : filteredSubnets.map((s, idx) => (
                  <tr key={idx}>
                    <td><strong>{s.network}</strong></td>
                    <td><code>{s.netmask}</code></td>
                    <td>
                      {s.pools?.map((p, pidx) => (
                        <div key={pidx} style={{ fontSize: '0.8rem' }}>{p.start} - {p.end}</div>
                      ))}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-ghost" onClick={() => openModal('subnet', s)}><Edit2 size={16} /></button>
                        <button className="btn btn-ghost" style={{ color: 'var(--accent-red)' }} onClick={() => handleDelete('subnet', s.network)}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'hosts' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2>{t('config.host_reservations')}</h2>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: '250px' }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input type="text" placeholder={t('common.search')} className="input-field" style={{ paddingLeft: '32px' }} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              <button className="btn btn-primary" onClick={() => openModal('host')}><Plus size={18} /> {t('config.add_host')}</button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <button className={`btn btn-sm ${activePoolFilter === 'All' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActivePoolFilter('All')}>{t('dashboard.all_pools')}</button>
            {config.subnets.map(s => (
              <button key={s.network} className={`btn btn-sm ${activePoolFilter === s.network ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActivePoolFilter(s.network)}>{s.network}</button>
            ))}
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>{t('config.name')}</th>
                  <th>{t('config.mac')}</th>
                  <th>{t('config.ip')}</th>
                  <th>{t('config.hostname')}</th>
                  <th>{t('config.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5">{t('common.loading')}</td></tr>
                ) : filteredHosts.map((h, idx) => (
                  <tr key={idx}>
                    <td><strong>{h.name}</strong></td>
                    <td><code>{h.hardware}</code></td>
                    <td><code>{h.address}</code></td>
                    <td>{h.hostname || '-'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-ghost" onClick={() => openModal('host', h)}><Edit2 size={16} /></button>
                        <button className="btn btn-ghost" style={{ color: 'var(--accent-red)' }} onClick={() => handleDelete('host', h.id)}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'globals' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
            <h2>{t('config.global_options')}</h2>
            <button className="btn btn-primary" onClick={saveGlobals} disabled={saving}><Save size={18} /> {saving ? t('config.saving') : t('common.save')}</button>
          </div>
          <textarea 
            className="input-field"
            style={{ width: '100%', height: '400px', fontFamily: 'monospace', padding: '1rem', fontSize: '0.9rem', lineHeight: '1.5' }}
            value={config.globals.join('\n')}
            onChange={(e) => setConfig({...config, globals: e.target.value.split('\n')})}
            placeholder={t('config.global_placeholder')}
          />
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <Modal close={() => setShowModal(false)} title={editingItem?.id || editingItem?.network ? t('config.edit_item') : t('config.new_item')} onSave={handleSave} saving={saving}>
            {editingItem._type === 'host' ? (
              <HostForm data={formData} set={setFormData} t={t} />
            ) : (
              <SubnetForm data={formData} set={setFormData} t={t} />
            )}
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
};

const TabBtn = ({ active, onClick, icon, label }) => (
  <button className={`btn ${active ? 'btn-primary' : 'btn-ghost'}`} onClick={onClick} style={{ borderRadius: '8px' }}>{icon} {label}</button>
);

const Modal = ({ children, close, title, onSave, saving, t }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay">
    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="modal-content card" style={{ maxWidth: '600px', width: '90%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        <button className="btn btn-ghost" onClick={close}><X /></button>
      </div>
      <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: '0.5rem' }}>{children}</div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
        <button className="btn btn-ghost" onClick={close}>Cancel</button>
        <button className="btn btn-primary" onClick={onSave} disabled={saving}>{saving ? '...' : 'Save'}</button>
      </div>
    </motion.div>
  </motion.div>
);

const HostForm = ({ data, set, t }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
    <Input label={t('config.internal_name')} value={data.name} onChange={v => set({...data, name: v})} />
    <Input label={t('config.mac')} value={data.hardware} onChange={v => set({...data, hardware: v})} placeholder="00:00:00:00:00:00" />
    <Input label={t('config.ip')} value={data.address} onChange={v => set({...data, address: v})} />
    <Input label={t('config.hostname')} value={data.hostname} onChange={v => set({...data, hostname: v})} />
  </div>
);

const SubnetForm = ({ data, set, t }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
    <Input label={t('config.subnet_network')} value={data.network} onChange={v => set({...data, network: v})} />
    <Input label={t('config.subnet_netmask')} value={data.netmask} onChange={v => set({...data, netmask: v})} />
    
    <div>
      <label style={{ display: 'block', marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600 }}>{t('config.pool_range')}</label>
      {data.pools.map((p, i) => (
        <div key={i} style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.25rem', background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ flex: 1 }}>
              <input type="text" placeholder={t('config.start_ip')} className="input-field" value={p.start} onChange={e => {
                const pools = [...data.pools]; pools[i].start = e.target.value; set({...data, pools});
              }} />
            </div>
            <div style={{ flex: 1 }}>
              <input type="text" placeholder={t('config.end_ip')} className="input-field" value={p.end} onChange={e => {
                const pools = [...data.pools]; pools[i].end = e.target.value; set({...data, pools});
              }} />
            </div>
            <button className="btn btn-ghost" style={{ color: 'var(--accent-red)' }} onClick={() => {
              const pools = data.pools.filter((_, idx) => idx !== i); set({...data, pools});
            }}><Trash2 size={18} /></button>
          </div>
          
          <div style={{ paddingLeft: '1rem', borderLeft: '2px solid var(--accent-blue)' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t('config.pool_options')}</label>
            {(p.options || []).map((opt, optIdx) => (
              <div key={optIdx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input type="text" className="input-field" style={{ flex: 1, fontSize: '0.875rem' }} value={opt} onChange={e => {
                  const pools = [...data.pools]; pools[i].options[optIdx] = e.target.value; set({...data, pools});
                }} />
                <button className="btn btn-ghost btn-sm" onClick={() => {
                  const pools = [...data.pools]; pools[i].options = pools[i].options.filter((_, idx) => idx !== optIdx); set({...data, pools});
                }}><X size={14} /></button>
              </div>
            ))}
            <button className="btn btn-ghost btn-sm" onClick={() => {
              const pools = [...data.pools]; pools[i].options = [...(pools[i].options || []), '']; set({...data, pools});
            }}><Plus size={14} /> {t('config.add_option')}</button>
          </div>
        </div>
      ))}
      <button className="btn btn-ghost btn-sm" onClick={() => set({...data, pools: [...data.pools, {start: '', end: '', options: []}]})}><Plus size={16} /> {t('config.add_pool')}</button>
    </div>

    <div>
      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>{t('config.general_subnet_options')}</label>
      {(data.options || []).map((o, i) => (
        <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <input type="text" className="input-field" style={{ flex: 1 }} value={o} onChange={e => {
            const options = [...data.options]; options[i] = e.target.value; set({...data, options});
          }} />
          <button className="btn btn-ghost" style={{ color: 'var(--accent-red)' }} onClick={() => {
            const options = data.options.filter((_, idx) => idx !== i); set({...data, options});
          }}><Trash2 size={18} /></button>
        </div>
      ))}
      <button className="btn btn-ghost btn-sm" onClick={() => set({...data, options: [...(data.options || []), '']})}><Plus size={16} /> {t('config.add_subnet_option')}</button>
    </div>
  </div>
);

const Input = ({ label, value, onChange, placeholder }) => (
  <div>
    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{label}</label>
    <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} className="input-field" style={{ width: '100%' }} placeholder={placeholder} />
  </div>
);

export default ConfigEditor;
