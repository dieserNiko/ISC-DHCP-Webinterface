import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Play, Pause, Trash2, Download } from 'lucide-react';

const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const logEndRef = useRef(null);
  const eventSourceRef = useRef(null);

  useEffect(() => {
    if (!isPaused) {
      startStreaming();
    } else {
      stopStreaming();
    }
    return () => stopStreaming();
  }, [isPaused]);

  useEffect(() => {
    if (!isPaused) {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const startStreaming = () => {
    const es = new EventSource('/api/logs/stream');
    es.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setLogs((prev) => [...prev.slice(-499), data.line]); // Keep last 500 lines
    };
    es.onerror = (err) => {
      console.error('SSE Error:', err);
      es.close();
    };
    eventSourceRef.current = es;
  };

  const stopStreaming = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  };

  const clearLogs = () => setLogs([]);

  const downloadLogs = () => {
    const blob = new Blob([logs.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dhcp-logs-${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fade-in" style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Terminal size={24} style={{ color: 'var(--accent-blue)' }} />
          <h1>Live Protokoll</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className={`btn ${isPaused ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setIsPaused(!isPaused)}>
            {isPaused ? <Play size={18} /> : <Pause size={18} />}
            {isPaused ? 'Fortsetzen' : 'Anhalten'}
          </button>
          <button className="btn btn-ghost" onClick={clearLogs} title="Leeren">
            <Trash2 size={18} />
          </button>
          <button className="btn btn-ghost" onClick={downloadLogs} title="Download">
            <Download size={18} />
          </button>
        </div>
      </div>

      <div style={{ 
        flex: 1, 
        background: '#0a0a0a', 
        borderRadius: '12px', 
        padding: '1rem', 
        fontFamily: 'monospace', 
        fontSize: '0.8125rem', 
        overflowY: 'auto',
        border: '1px solid var(--border-color)',
        color: '#d1d1d1',
        lineHeight: '1.6'
      }}>
        {logs.length === 0 ? (
          <div style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '2rem' }}>
            Warte auf Logs...
          </div>
        ) : (
          logs.map((log, i) => <LogLine key={i} text={log} />)
        )}
        <div ref={logEndRef} />
      </div>
    </div>
  );
};

const LogLine = ({ text }) => {
  const isAck = text.includes('DHCPACK');
  const isRequest = text.includes('DHCPREQUEST');
  const isDiscover = text.includes('DHCPDISCOVER');
  const isOffer = text.includes('DHCPOFFER');

  let color = 'inherit';
  if (isAck) color = 'var(--accent-green)';
  if (isOffer) color = 'var(--accent-blue)';
  if (isRequest || isDiscover) color = '#fbbf24';

  return (
    <div style={{ whiteSpace: 'pre-wrap', marginBottom: '2px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '2px' }}>
      <span style={{ color: 'var(--text-secondary)', marginRight: '8px' }}>
        {text.substring(0, 16)}
      </span>
      <span style={{ color }}>{text.substring(16)}</span>
    </div>
  );
};

export default Logs;
