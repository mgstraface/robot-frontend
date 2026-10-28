import { useCallback, useEffect, useState } from 'react';
import { api, getToken, setToken, UnauthorizedError } from './api.js';
import ChatPanel from './components/ChatPanel.jsx';
import EventsPanel from './components/EventsPanel.jsx';
import Face, { EMOTION_LABELS } from './components/Face.jsx';
import HistoryPanel from './components/HistoryPanel.jsx';
import Login from './components/Login.jsx';
import PersonalityPanel from './components/PersonalityPanel.jsx';

const TABS = [
  { id: 'personality', label: 'Personalidad' },
  { id: 'history', label: 'Memoria' },
  { id: 'events', label: 'Eventos' },
];

export default function App() {
  const [cfg, setCfg] = useState(null);
  const [checking, setChecking] = useState(Boolean(getToken()));
  const [name, setName] = useState('Robi');
  const [emotion, setEmotion] = useState('neutral');
  const [status, setStatus] = useState(null);
  const [tab, setTab] = useState('personality');
  const [toast, setToast] = useState('');

  const logout = useCallback(() => {
    setToken('');
    setCfg(null);
  }, []);

  const onError = useCallback(
    (err) => {
      if (err instanceof UnauthorizedError) return logout();
      setToast(err.message || String(err));
    },
    [logout]
  );

  // Validar el token guardado al abrir
  useEffect(() => {
    if (!getToken()) return;
    api
      .config()
      .then(setCfg)
      .catch(() => setToken(''))
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    if (!cfg) return;
    api.getPersonality().then((p) => setName(p.name)).catch(onError);
  }, [cfg, onError]);

  // Estado de los robots conectados, cada 3 segundos
  useEffect(() => {
    if (!cfg) return undefined;
    let alive = true;
    const tick = () =>
      api
        .status()
        .then((s) => alive && setStatus(s))
        .catch((err) => alive && err instanceof UnauthorizedError && logout());
    tick();
    const id = setInterval(tick, 3000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [cfg, logout]);

  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(''), 5000);
    return () => clearTimeout(id);
  }, [toast]);

  if (checking) return null;
  if (!cfg) return <Login onLogin={setCfg} />;

  const devices = status?.devices || [];
  const robotId = devices[0]?.deviceId;

  async function sendExpression(e) {
    setEmotion(e);
    if (!robotId) return;
    try {
      await api.expression(e);
    } catch (err) {
      onError(err);
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo" aria-hidden="true" />
          <h1>{name}</h1>
        </div>
        <div className="status-pills">
          <span className={`pill ${robotId ? 'on' : 'off'}`}>
            <i />
            {robotId ? `${devices.length} robot${devices.length > 1 ? 's' : ''} conectado${devices.length > 1 ? 's' : ''}` : 'Robot desconectado'}
          </span>
          <span className="pill neutral">{cfg.model}</span>
          <span className={`pill ${cfg.voice ? 'on' : 'neutral'}`}>{cfg.voice ? 'Voz activa' : 'Solo texto'}</span>
          <button type="button" className="ghost small" onClick={logout}>
            Salir
          </button>
        </div>
      </header>

      <main className="layout">
        <div className="col">
          <section className="card stage">
            <Face emotion={emotion} size={340} />
            <div className="expressions" role="group" aria-label="Expresiones">
              {cfg.emotions.map((e) => (
                <button
                  key={e}
                  type="button"
                  className={`chip ${e === emotion ? 'active' : ''}`}
                  onClick={() => sendExpression(e)}
                  title={robotId ? 'Mostrar en el panel y en el robot' : 'Vista previa (no hay robot conectado)'}
                >
                  {EMOTION_LABELS[e] || e}
                </button>
              ))}
            </div>
          </section>
          <ChatPanel onEmotion={setEmotion} robotId={robotId} serverVoice={cfg.voice} onError={onError} />
        </div>

        <section className="card side">
          <nav className="tabs" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                className={tab === t.id ? 'active' : ''}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>
          {tab === 'personality' && <PersonalityPanel onSaved={(p) => setName(p.name)} onError={onError} />}
          {tab === 'history' && <HistoryPanel onError={onError} />}
          {tab === 'events' && <EventsPanel status={status} />}
        </section>
      </main>

      {toast && (
        <div className="toast" role="alert" onClick={() => setToast('')}>
          {toast}
        </div>
      )}
    </div>
  );
}
