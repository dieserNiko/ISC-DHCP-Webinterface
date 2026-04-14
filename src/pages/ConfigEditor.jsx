import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Save, X, Wifi, Cpu, Settings, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const ConfigEditor = () => {
  const [config, setConfig] = useState({ subnets: [], hosts: [], globals: [] });
  const [activeTab, setActiveTab] = useState(localStorage.getItem('activeConfigTab') || 'subnets');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  
  // Search and Filter states for Hosts
  const [hostFilter, setHostFilter] = useState('');
  const [activePoolFilter, setActivePoolFilter] = useState('All');

  useEffect(() => {
    localStorage.setItem('activeConfigTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
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
    setEditingItem(item ? { ...item, type } : { type });
    setFormData(item || getEmptyEntity(type));
    setShowModal(true);
  };

  const getEmptyEntity = (type) => {
    if (type === 'host') return { name: '', hardware: '', address: '', hostname: '' };
    if (type === 'subnet') return { network: '', netmask: '', pools: [{ start: '', end: '', options: [] }], options: [] };
    return {};
  };

  const handleSave = async () => {
    const endpoint = editingItem.type === 'host' ? '/api/hosts' : '/api/subnets';
    try {
      const response = await axios.post(endpoint, formData);
      if (response.data.message) {
        // Show success including restart message
        console.log(response.data.message);
      }
      setShowModal(false);
      fetchConfig();
    } catch (err) {
      alert('Fehler: ' + err.message);
    }
  };

  const saveGlobals = async () => {
    try {
      await axios.post('/api/globals', { globals: config.globals });
      alert('Globale Einstellungen gespeichert und Service neu gestartet');
    } catch (err) {
      alert('Fehler');
    }
  };

  const handleDelete = async (type, id) => {
    if (!confirm('Wirklich löschen?')) return;
    const endpoint = type === 'host' ? `/api/hosts/${id}` : `/api/subnets/${id}`;
    try {
      await axios.delete(endpoint);
      fetchConfig();
    } catch (err) {
      alert('Fehler');
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
      (h.name || '').toLowerCase().includes(hostFilter.toLowerCase()) ||
      (h.address || '').includes(hostFilter) ||
      (h.hardware || '').toLowerCase().includes(hostFilter.toLowerCase()) ||
      (h.hostname || '').toLowerCase().includes(hostFilter.toLowerCase());
    
    const matchesPool = activePoolFilter === 'All' || isIpInSubnet(h.address, activePoolFilter);
    
    return matchesSearch && matchesPool;
  });

  return (
    <>
      <div className="fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
          <h1>Konfiguration</h1>
          <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--panel-bg)', padding: '0.25rem', borderRadius: '8px' }}>
            <TabBtn active={activeTab === 'subnets'} onClick={() => setActiveTab('subnets')} icon={<Wifi size={18} />} label="Subnetze" />
            <TabBtn active={activeTab === 'hosts'} onClick={() => setActiveTab('hosts')} icon={<Cpu size={18} />} label="Reservierungen" />
            <TabBtn active={activeTab === 'globals'} onClick={() => setActiveTab('globals')} icon={<Globe size={18} />} label="Global" />
          </div>
        </div>

        {activeTab === 'subnets' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2>Subnetz-Pools</h2>
              <button className="btn btn-primary" onClick={() => openModal('subnet')}><Plus size={18} /> Neu</button>
            </div>
            <DataTable 
              headers={['Netzwerk', 'Netmask', 'Pools', 'Aktionen']}
              data={config.subnets}
              renderRow={(s) => (
                <tr key={s.id}>
                  <td><strong>{s.network}</strong></td>
                  <td>{s.netmask}</td>
                  <td>{s.pools?.map(p => `${p.start}-${p.end}`).join(', ')}</td>
                  <td>
                    <ActionBtns onEdit={() => openModal('subnet', s)} onDelete={() => handleDelete('subnet', s.id)} />
                  </td>
                </tr>
              )}
            />
          </div>
        )}

        {activeTab === 'hosts' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h2>Host Reservierungen</h2>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <div style={{ position: 'relative', width: '200px' }}>
                   <input 
                    type="text" 
                    placeholder="Suchen..." 
                    className="input-field" 
                    style={{ width: '100%', padding: '0.5rem' }} 
                    value={hostFilter}
                    onChange={e => setHostFilter(e.target.value)}
                  />
                </div>
                <button className="btn btn-primary" onClick={() => openModal('host')}><Plus size={18} /> Neu</button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <button 
                className={`btn btn-sm ${activePoolFilter === 'All' ? 'btn-primary' : 'btn-ghost'}`} 
                onClick={() => setActivePoolFilter('All')}
              >
                Alle
              </button>
              {config.subnets.map(s => (
                <button 
                  key={s.network}
                  className={`btn btn-sm ${activePoolFilter === s.network ? 'btn-primary' : 'btn-ghost'}`} 
                  onClick={() => setActivePoolFilter(s.network)}
                >
                  {s.network}
                </button>
              ))}
            </div>

            <DataTable 
              headers={['Name', 'MAC', 'IP', 'Hostname', 'Aktionen']}
              data={filteredHosts}
              renderRow={(h) => (
                <tr key={h.id}>
                  <td>{h.name} {h.type === 'subclass' && <span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>Subclass</span>}</td>
                  <td><code>{h.hardware}</code></td>
                  <td><strong style={{ color: 'var(--accent-blue)' }}>{h.address}</strong></td>
                  <td>{h.hostname || '-'}</td>
                  <td>
                    <ActionBtns onEdit={() => openModal('host', h)} onDelete={() => handleDelete('host', h.id)} />
                  </td>
                </tr>
              )}
            />
          </div>
        )}

        {activeTab === 'globals' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2>Globale Optionen</h2>
              <button className="btn btn-primary" onClick={saveGlobals}><Save size={18} /> Speichern</button>
            </div>
            <textarea 
              className="input-field"
              style={{ width: '100%', height: '300px', fontFamily: 'monospace', padding: '1rem' }}
              value={config.globals.join('\n')}
              onChange={(e) => setConfig({...config, globals: e.target.value.split('\n')})}
              placeholder="z.B. option domain-name-servers 8.8.8.8;"
            />
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <Modal close={() => setShowModal(false)} title={editingItem?.id ? 'Bearbeiten' : 'Neu'} onSave={handleSave}>
            {editingItem?.type === 'host' ? (
              <HostForm data={formData} set={setFormData} />
            ) : (
              <SubnetForm data={formData} set={setFormData} />
            )}
          </Modal>
        )}
      </AnimatePresence>
    </>
  );
};

const TabBtn = ({ active, onClick, icon, label }) => (
  <button className={`btn ${active ? 'btn-primary' : 'btn-ghost'}`} onClick={onClick}>{icon} {label}</button>
);

const ActionBtns = ({ onEdit, onDelete }) => (
  <div style={{ display: 'flex', gap: '0.25rem' }}>
    <button className="btn btn-ghost" onClick={onEdit}><Edit2 size={16} /></button>
    <button className="btn btn-ghost" style={{ color: 'var(--accent-red)' }} onClick={onDelete}><Trash2 size={16} /></button>
  </div>
);

const DataTable = ({ headers, data, renderRow }) => (
  <div className="table-container">
    <table>
      <thead><tr>{headers.map(h => <th key={h}>{h}</th>)}</tr></thead>
      <tbody>{data.map(renderRow)}</tbody>
    </table>
  </div>
);

const Modal = ({ children, close, title, onSave }) => {
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = originalStyle; };
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="modal-content">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="btn btn-ghost" onClick={close}><X /></button>
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={close}>Abbrechen</button>
          <button className="btn btn-primary" onClick={onSave}>Speichern</button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const HostForm = ({ data, set }) => (
  <div className="form-group">
    <Input label="Eindeutiger Name" value={data.name} onChange={v => set({...data, name: v})} />
    <Input label="MAC Adresse" value={data.hardware} onChange={v => set({...data, hardware: v})} />
    <Input label="IP Adresse" value={data.address} onChange={v => set({...data, address: v})} />
    <Input label="Option Hostname" value={data.hostname} onChange={v => set({...data, hostname: v})} />
  </div>
);

const SubnetForm = ({ data, set }) => (
  <div className="form-group">
    <Input label="Netzwerk" value={data.network} onChange={v => set({...data, network: v})} />
    <Input label="Netmask" value={data.netmask} onChange={v => set({...data, netmask: v})} />
    
    <div style={{ marginBottom: '1.5rem' }}>
      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Pools & Spezifische Optionen</label>
      {data.pools.map((p, i) => (
        <div key={i} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', marginBottom: '1rem', background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <input type="text" placeholder="Start IP" className="input-field" style={{ flex: 1, padding: '0.5rem' }} value={p.start} onChange={e => {
              const pools = [...data.pools]; pools[i].start = e.target.value; set({...data, pools});
            }} />
            <input type="text" placeholder="End IP" className="input-field" style={{ flex: 1, padding: '0.5rem' }} value={p.end} onChange={e => {
              const pools = [...data.pools]; pools[i].end = e.target.value; set({...data, pools});
            }} />
            <button className="btn btn-ghost" onClick={() => {
              const pools = data.pools.filter((_, idx) => idx !== i); set({...data, pools});
            }}><Trash2 size={16} /></button>
          </div>
          
          <div style={{ paddingLeft: '1rem', borderLeft: '2px solid var(--accent-blue)' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Pool Optionen (z.B. option routers 10.0.0.1)</label>
            {(p.options || []).map((opt, optIdx) => (
              <div key={optIdx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <input 
                  type="text" 
                  className="input-field" 
                  style={{ flex: 1, padding: '0.25rem 0.5rem', fontSize: '0.875rem' }} 
                  value={opt} 
                  onChange={e => {
                    const pools = [...data.pools];
                    pools[i].options[optIdx] = e.target.value;
                    set({...data, pools});
                  }}
                />
                <button className="btn btn-ghost btn-sm" onClick={() => {
                  const pools = [...data.pools];
                  pools[i].options = pools[i].options.filter((_, idx) => idx !== optIdx);
                  set({...data, pools});
                }}><X size={14} /></button>
              </div>
            ))}
            <button className="btn btn-ghost btn-sm" style={{ marginTop: '0.25rem', fontSize: '0.75rem' }} onClick={() => {
              const pools = [...data.pools];
              pools[i].options = [...(pools[i].options || []), ''];
              set({...data, pools});
            }}><Plus size={14} /> Option hinzufügen</button>
          </div>
        </div>
      ))}
      <button className="btn btn-ghost btn-sm" onClick={() => set({...data, pools: [...data.pools, {start: '', end: '', options: []}]})}><Plus size={16} /> Pool hinzufügen</button>
    </div>

    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Allgemeine Subnetz-Optionen</label>
      {(data.options || []).map((o, i) => (
        <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <input type="text" className="input-field" style={{ flex: 1, padding: '0.5rem' }} value={o} onChange={e => {
            const options = [...data.options]; options[i] = e.target.value; set({...data, options});
          }} />
          <button className="btn btn-ghost" onClick={() => {
            const options = data.options.filter((_, idx) => idx !== i); set({...data, options});
          }}><Trash2 size={16} /></button>
        </div>
      ))}
      <button className="btn btn-ghost btn-sm" onClick={() => set({...data, options: [...(data.options || []), '']})}><Plus size={16} /> Subnetz-Option hinzufügen</button>
    </div>
  </div>
);

const Input = ({ label, value, onChange }) => (
  <div style={{ marginBottom: '1rem' }}>
    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{label}</label>
    <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} className="input-field" style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'white' }} />
  </div>
);

export default ConfigEditor;
