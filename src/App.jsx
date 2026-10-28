import { useCallback, useEffect, useState } from 'react';
import { api, getToken, setToken, UnauthorizedError } from './api.js';
import AppearancePanel from './components/AppearancePanel.jsx';
import ChatPanel from './components/ChatPanel.jsx';
import EventsPanel from './components/EventsPanel.jsx';
import Face, { EMOTION_LABELS, IDLE_ACTIONS } from './components/Face.jsx';
import HistoryPanel from './components/HistoryPanel.jsx';
import Login from './components/Login.jsx';
import PersonalityPanel from './components/PersonalityPanel.jsx';
import { speakSpooky } from './speech.js';
import { useIdleLife } from './useIdleLife.js';

const LIFE_KEY = 'robot_idle_life';
// Emociones de estado que no se disipan solas (duran lo que dura la acción)
const STICKY = ['neutral', 'pensando', 'escuchando'];
const DECAY_MS = 7000;

function loadLifePref() {
  try {
    return localStorage.getItem(LIFE_KEY) !== '0';
  } catch {
    return true;
  }
}

const TABS = [
  { id: 'appearance', label: 'Apariencia' },
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
  const [tab, setTab] = useState('appearance');
  const [toast, setToast] = useState('');
  const [life, setLife] = useState(loadLifePref);
  const [appearance, setAppearance] = useState({ eyeColor: '#5ef2ff', faceStyle: 'tierno' });
  const [draftAppearance, setDraftAppearance] = useState(null);
  const look = draftAppearance || appearance;
  const { action, poke } = useIdleLife({ emotion, enabled: life && Boolean(cfg), faceStyle: look.faceStyle });

  // Toda interacción cuenta como actividad: corta la acción en curso y lo despierta
  const changeEmotion = useCallback(
    (e) => {
      poke();
      setEmotion(e);
    },
    [poke]
  );

  // Algunas acciones de vida propia tienen sonido (la risa macabra). Solo suenan con "Voz en la PC" activada.
  useEffect(() => {
    const sound = action && IDLE_ACTIONS[action]?.sound;
    if (!sound) return;
    let pcVoice = true;
    try {
      pcVoice = localStorage.getItem('robot_pc_voice') !== '0';
    } catch {
      /* sin storage */
    }
    if (pcVoice) speakSpooky(sound);
  }, [action]);

  // Con vida propia, las emociones vuelven solas a neutral después de un rato
  useEffect(() => {
    if (!life || STICKY.includes(emotion)) return undefined;
    const id = setTimeout(() => setEmotion('neutral'), DECAY_MS);
    return () => clearTimeout(id);
  }, [emotion, life]);

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
    api
      .getPersonality()
      .then((p) => {
        setName(p.name);
        if (p.eyeColor) setAppearance({ eyeColor: p.eyeColor, faceStyle: p.faceStyle || 'tierno' });
      })
      .catch(onError);
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

  function toggleLife(on) {
    setLife(on);
    poke();
    try {
      localStorage.setItem(LIFE_KEY, on ? '1' : '0');
    } catch {
      /* sin storage */
    }
  }

  function pet() {
    changeEmotion(action === 'dormir' ? 'sorprendido' : 'amor');
  }

  async function sendExpression(e) {
    changeEmotion(e);
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
          {cfg.env === 'dev' && <span className="pill dev">Entorno de pruebas</span>}
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
            <Face emotion={emotion} action={action} size={340} onPet={pet} eyeColor={look.eyeColor} faceStyle={look.faceStyle} />
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
            <label className="toggle life-toggle">
              <input type="checkbox" checked={life} onChange={(e) => toggleLife(e.target.checked)} />
              Vida propia
            </label>
          </section>
          <ChatPanel onEmotion={changeEmotion} robotId={robotId} serverVoice={cfg.voice} onError={onError} />
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
          {tab === 'appearance' && (
            <AppearancePanel
              saved={appearance}
              draft={draftAppearance}
              onPreview={setDraftAppearance}
              onSaved={(a) => {
                setAppearance(a);
                setDraftAppearance(null);
              }}
              onError={onError}
            />
          )}
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
