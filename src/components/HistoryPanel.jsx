import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { EMOTION_LABELS } from './Face.jsx';
import MemoriesPanel from './MemoriesPanel.jsx';

const SOURCE_LABELS = { voice: 'voz', text: 'texto', panel: 'panel' };

function formatTime(iso) {
  return new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function HistoryPanel({ onError }) {
  const [messages, setMessages] = useState(null);
  const [deviceId, setDeviceId] = useState('');

  const load = useCallback(() => {
    api.messages(deviceId || undefined, 200).then(setMessages).catch(onError);
  }, [deviceId, onError]);

  useEffect(load, [load]);

  async function clear() {
    const scope = deviceId ? `de "${deviceId}"` : 'de TODOS los dispositivos';
    if (!window.confirm(`¿Borrar la memoria ${scope}? No se puede deshacer.`)) return;
    try {
      await api.clearMessages(deviceId || undefined);
      load();
    } catch (err) {
      onError(err);
    }
  }

  const devices = [...new Set((messages || []).map((m) => m.deviceId))];

  return (
    <div className="history">
      <MemoriesPanel onError={onError} />
      <h3>Conversaciones</h3>
      <div className="row">
        <select value={deviceId} onChange={(e) => setDeviceId(e.target.value)}>
          <option value="">Todos</option>
          {devices.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <button type="button" className="ghost" onClick={load}>
          Actualizar
        </button>
        <button type="button" className="danger" onClick={clear}>
          Borrar memoria
        </button>
      </div>

      {!messages && <p className="muted">Cargando…</p>}
      {messages?.length === 0 && <p className="muted">Todavía no hay conversaciones.</p>}
      <ol className="history-list">
        {messages?.map((m) => (
          <li key={m._id} className={m.role}>
            <div className="meta">
              <span>{m.role === 'user' ? 'Vos' : 'Robot'}</span>
              <span>{m.deviceId}</span>
              <span>{SOURCE_LABELS[m.source] || m.source}</span>
              {m.role === 'assistant' && <span>{EMOTION_LABELS[m.emotion] || m.emotion}</span>}
              <time>{formatTime(m.createdAt)}</time>
            </div>
            <p>{m.text}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
