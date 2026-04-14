import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Trash2, Download, Pause, Play } from 'lucide-react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const Logs = () => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef();

  useEffect(() => {
    let interval;
    if (!isPaused) {
      fetchLogs();
      interval = setInterval(fetchLogs, 2000);
    }
    return () => clearInterval(interval);
  }, [isPaused]);

  useEffect(() => {
    if (scrollRef.current && !isPaused) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isPaused]);

  const fetchLogs = async () => {
    try {
      const response = await axios.get('/api/logs?limit=100');
      setLogs(response.data);
    } catch (err) {
      console.error('Log fetch error:', err);
    }
  };

  const clearLogs = () => setLogs([]);

  const downloadLogs = () => {
    const element = document.createElement("a");
    const file = new Blob([logs.join('\n')], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `dhcp_logs_${new Date().toISOString()}.txt`;
    document.body.appendChild(element);
    element.click();
  };

  return (
    <div className="fade-in" style={{ height: 'calc(100vh - 4rem)', display: 'flex', flexDirection: 'column', padding: '2rem' }}>
      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1.5rem', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Terminal size={24} style={{ color: 'var(--accent-blue)' }} />
            <h1 style={{ margin: 0, fontSize: '1.5rem' }}>{t('logs.title')}</h1>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className={`btn ${isPaused ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setIsPaused(!isPaused)}>
              {isPaused ? <Play size={18} /> : <Pause size={18} />}
              {isPaused ? t('logs.resume') : t('logs.pause')}
            </button>
            <button className="btn btn-ghost" onClick={clearLogs} title={t('logs.clear')}>
              <Trash2 size={18} />
            </button>
            <button className="btn btn-ghost" onClick={downloadLogs} title={t('logs.download')}>
              <Download size={18} />
            </button>
          </div>
        </div>

        <div 
          ref={scrollRef}
          style={{ 
            flex: 1, 
            background: '#0f172a', 
            borderRadius: '12px', 
            padding: '1.5rem', 
            overflowY: 'auto', 
            fontFamily: '"Fira Code", monospace',
            fontSize: '0.875rem',
            lineHeight: '1.6',
            border: '1px solid var(--border-color)'
          }}
        >
          {logs.length === 0 ? (
            <div style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '2rem' }}>
              {t('logs.waiting')}
            </div>
          ) : (
            logs.map((log, i) => <LogLine key={i} text={log} />)
          )}
        </div>
      </div>
    </div>
  );
};

const LogLine = ({ text }) => {
  const isError = text.toLowerCase().includes('error') || text.toLowerCase().includes('fail');
  const isWarning = text.toLowerCase().includes('warn');
  
  let color = '#e2e8f0';
  if (isError) color = 'var(--accent-red)';
  else if (isWarning) color = '#fbbf24';

  return (
    <div style={{ marginBottom: '0.25rem', color, wordBreak: 'break-all', display: 'flex', gap: '1rem' }}>
      <span style={{ opacity: 0.3, userSelect: 'none' }}>❯</span>
      <span>{text}</span>
    </div>
  );
};

export default Logs;
