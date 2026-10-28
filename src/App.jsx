import { useCallback, useEffect, useRef, useState } from 'react';
import { api, getToken, setToken, UnauthorizedError } from './api.js';
import AppearancePanel from './components/AppearancePanel.jsx';
import ChatPanel from './components/ChatPanel.jsx';
import EventsPanel from './components/EventsPanel.jsx';
import Face, { actionMs, EMOTION_LABELS, IDLE_ACTIONS } from './components/Face.jsx';
import HistoryPanel from './components/HistoryPanel.jsx';
import Login from './components/Login.jsx';
import PersonalityPanel from './components/PersonalityPanel.jsx';
import RoutinesPanel from './components/RoutinesPanel.jsx';
import PhotosPanel from './components/PhotosPanel.jsx';
import GamesPanel from './components/GamesPanel.jsx';
import PptGame from './components/games/PptGame.jsx';
import CatchGame from './components/games/CatchGame.jsx';
import { photoUrl } from './photos.js';
import { speak, speakSpooky } from './speech.js';
import { useIdleLife } from './useIdleLife.js';

const LIFE_KEY = 'robot_idle_life';
// Emociones de estado que no se disipan solas (duran lo que dura la acción)
const STICKY = ['neutral', 'pensando', 'escuchando'];
const DECAY_MS = 7000;
const FEED_MS = 4000;
const TRIES = [
  { id: 'saludo', label: 'Saludo de la mañana' },
  { id: 'clima', label: 'Clima' },
  { id: 'agua', label: 'Agua' },
  { id: 'reunion', label: 'Aviso de reunión' },
  { id: 'susto', label: 'Susto' },
  { id: 'deploy-ok', label: 'Deploy OK' },
  { id: 'deploy-falla', label: 'Deploy falló' },
  { id: 'foco-fin', label: 'Fin de foco' },
];
const TRIVIA_PROMPT =
  '¡Juguemos a una trivia de películas de terror! Haceme una pregunta por vez con tres opciones, esperá mi respuesta, decime si acerté y llevá la cuenta.';

const KIND_LABELS = { saludo: 'Saludo', reunion: 'Reunión', agua: 'Agua', foco: 'Foco', deploy: 'Deploy' };

function pcVoiceOn() {
  try {
    return localStorage.getItem('robot_pc_voice') !== '0';
  } catch {
    return true;
  }
}

function localHour(tz) {
  try {
    return Number(new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: '2-digit', hourCycle: 'h23' }).format(new Date()));
  } catch {
    return new Date().getHours();
  }
}

function isSleepHour(hour, from, to) {
  if (from === to) return false;
  return from < to ? hour >= from && hour < to : hour >= from || hour < to;
}

function mmss(ms) {
  const t = Math.max(0, Math.round(ms / 1000));
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

function loadLifePref() {
  try {
    return localStorage.getItem(LIFE_KEY) !== '0';
  } catch {
    return true;
  }
}

const TABS = [
  { id: 'appearance', label: 'Apariencia' },
  { id: 'routines', label: 'Rutinas' },
  { id: 'games', label: 'Juegos' },
  { id: 'photos', label: 'Fotos' },
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
  const [settings, setSettings] = useState(null);
  const [night, setNight] = useState(false);
  const [focus, setFocus] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [forced, setForced] = useState(null); // acción que pidió el servidor o el panel (clima, susto…)
  const [announcement, setAnnouncement] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [photo, setPhoto] = useState(null); // foto que se está mostrando (portarretrato)
  const [game, setGame] = useState(null);
  const [showTry, setShowTry] = useState(false);
  const [trying, setTrying] = useState('');
  const [chatPrompt, setChatPrompt] = useState(null);
  const photoIndex = useRef(0);
  const forcedQueue = useRef({ timer: null });
  const feedRef = useRef({ lastId: null, poll: null });
  const { action: idleAction, poke } = useIdleLife({
    emotion,
    enabled: life && Boolean(cfg) && !focus,
    faceStyle: look.faceStyle,
    night,
  });
  const action = forced || idleAction;

  // Toda interacción cuenta como actividad: corta la acción en curso y lo despierta
  const changeEmotion = useCallback(
    (e) => {
      // una interacción corta cualquier animación pedida (clima, susto…) y la foto del portarretrato
      clearTimeout(forcedQueue.current.timer);
      setForced(null);
      setPhoto(null);
      poke();
      setEmotion(e);
    },
    [poke]
  );

  // Algunas acciones tienen sonido (la risa macabra). Solo suenan con "Voz en la PC" activada.
  useEffect(() => {
    const sound = action && IDLE_ACTIONS[String(action).split(':')[0]]?.sound;
    if (sound && pcVoiceOn()) speakSpooky(sound);
  }, [action]);

  // Reproduce una secuencia de acciones en la cara (ej. ["apagon", "risa"] o ["clima"] con el clima)
  const playActions = useCallback(
    (actions, weather) => {
      clearTimeout(forcedQueue.current.timer);
      const list = actions.map((a) => (a === 'clima' ? `clima:${weather || 'despejado'}` : a));
      const step = (i) => {
        if (i >= list.length) {
          setForced(null);
          poke();
          return;
        }
        setForced(list[i]);
        forcedQueue.current.timer = setTimeout(() => step(i + 1), actionMs(list[i]));
      };
      step(0);
    },
    [poke]
  );
  useEffect(() => () => clearTimeout(forcedQueue.current.timer), []);

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

  // Ajustes de rutinas (horario de dormir y zona horaria)
  useEffect(() => {
    if (!cfg) return;
    api.settings().then(setSettings).catch(() => {});
    api
      .focus()
      .then((r) => setFocus(r.focus))
      .catch(() => {});
  }, [cfg]);

  // Fotos del portarretrato
  const loadPhotos = useCallback(() => {
    api
      .photos()
      .then(setPhotos)
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (cfg) loadPhotos();
  }, [cfg, loadPhotos]);

  const showPhoto = useCallback(
    async (ms) => {
      if (!photos.length) return;
      const p = photos[photoIndex.current % photos.length];
      photoIndex.current += 1;
      try {
        setPhoto(await photoUrl(p.id));
      } catch {
        return;
      }
      await new Promise((r) => setTimeout(r, ms));
      setPhoto(null);
    },
    [photos]
  );

  // Portarretrato: intercala la cara con las fotos mientras está tranquilo
  useEffect(() => {
    const quiet = emotion === 'neutral' && !forced && !focus && !night && !game;
    if (!settings?.frameEnabled || !photos.length || !quiet) return undefined;
    let alive = true;
    let timer = null;
    const loop = () => {
      timer = setTimeout(async () => {
        if (!alive) return;
        await showPhoto(settings.framePhotoSec * 1000);
        if (alive) loop();
      }, settings.frameFaceSec * 1000);
    };
    loop();
    return () => {
      alive = false;
      clearTimeout(timer);
      setPhoto(null);
    };
  }, [settings, photos, emotion, forced, focus, night, game, showPhoto]);

  // ¿Es horario de dormir? Se revisa cada minuto
  useEffect(() => {
    if (!settings) return undefined;
    const check = () => setNight(isSleepHour(localHour(settings.timezone), settings.sleepFrom, settings.sleepTo));
    check();
    const id = setInterval(check, 60000);
    return () => clearInterval(id);
  }, [settings]);

  // Cuenta regresiva del bloque de foco
  useEffect(() => {
    if (!focus) return undefined;
    const id = setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= focus.endsAt) setFocus(null);
    }, 1000);
    return () => clearInterval(id);
  }, [focus]);

  // Avisos que da el robot por su cuenta (saludo, reuniones, agua, foco, deploys, sustos)
  useEffect(() => {
    if (!cfg) return undefined;
    let alive = true;
    let timer = null;
    const handle = (item) => {
      if (item.kind === 'foco-inicio') {
        api.focus().then((r) => alive && setFocus(r.focus)).catch(() => {});
        return;
      }
      if (item.kind === 'foco') setFocus(null);
      if (item.text) {
        setAnnouncement({ id: item.id, text: item.text, kind: item.kind });
        if (pcVoiceOn()) speak(item.text, { serverVoice: cfg.voice });
      }
      if (item.emotion && item.emotion !== 'neutral') changeEmotion(item.emotion);
      if (item.actions?.length) playActions(item.actions, item.weather);
    };
    const poll = async () => {
      clearTimeout(timer);
      try {
        const after = feedRef.current.lastId ?? -1;
        const r = await api.feed(after);
        if (!alive) return;
        if (feedRef.current.lastId !== null) r.items.forEach(handle);
        feedRef.current.lastId = r.lastId;
      } catch {
        /* reintenta en el próximo ciclo */
      }
      if (alive) timer = setTimeout(poll, FEED_MS);
    };
    feedRef.current.poll = poll;
    poll();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [cfg, changeEmotion, playActions]);

  // La burbuja del aviso se va sola
  useEffect(() => {
    if (!announcement) return undefined;
    const id = setTimeout(() => setAnnouncement(null), 12000);
    return () => clearTimeout(id);
  }, [announcement]);

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

  async function tryRoutine(kind) {
    setTrying(kind);
    try {
      if (kind === 'clima') {
        const w = await api.weather();
        playActions(['clima'], w.category);
      } else {
        changeEmotion('pensando');
        await api.tryRoutine(kind);
        await feedRef.current.poll?.();
      }
    } catch (err) {
      onError(err);
    } finally {
      setTrying('');
    }
  }

  function playGame(id) {
    if (id === 'trivia') {
      setChatPrompt({ id: Date.now(), text: TRIVIA_PROMPT });
      return;
    }
    setGame(id);
  }

  function exitGame() {
    setGame(null);
    changeEmotion('neutral');
  }

  async function toggleFocus() {
    try {
      if (focus) {
        await api.stopFocus();
        setFocus(null);
      } else {
        const r = await api.startFocus(25);
        setFocus(r.focus);
        changeEmotion('pensando');
      }
    } catch (err) {
      onError(err);
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
            {game === 'ppt' && <PptGame eyeColor={look.eyeColor} faceStyle={look.faceStyle} onExit={exitGame} />}
            {game === 'ojo' && <CatchGame eyeColor={look.eyeColor} faceStyle={look.faceStyle} onExit={exitGame} />}
            {!game && (
            <>
            <Face emotion={emotion} action={action} size={340} onPet={pet} eyeColor={look.eyeColor} faceStyle={look.faceStyle} photo={photo} />
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
            {announcement && (
              <p className="announce" role="status">
                {KIND_LABELS[announcement.kind] && <small>{KIND_LABELS[announcement.kind]}</small>}
                {announcement.text}
              </p>
            )}
            <div className="focus-bar">
              {focus ? (
                <>
                  <span className="focus-time" aria-live="off">
                    Foco · {mmss(focus.endsAt - now)}
                  </span>
                  <button type="button" className="ghost small" onClick={toggleFocus}>
                    Cortar
                  </button>
                </>
              ) : (
                <button type="button" className="ghost small" onClick={toggleFocus}>
                  Foco 25 min
                </button>
              )}
              <label className="toggle life-toggle">
                <input type="checkbox" checked={life} onChange={(e) => toggleLife(e.target.checked)} />
                Vida propia
              </label>
              <button type="button" className="ghost small" onClick={() => setShowTry((v) => !v)} aria-expanded={showTry}>
                {showTry ? 'Cerrar pruebas' : 'Probar'}
              </button>
            </div>
            {showTry && (
              <div className="try-row" role="group" aria-label="Probar rutinas">
                {TRIES.map((t) => (
                  <button key={t.id} type="button" className="chip" onClick={() => tryRoutine(t.id)} disabled={Boolean(trying)}>
                    {trying === t.id ? 'Probando…' : t.label}
                  </button>
                ))}
              </div>
            )}
            </>
            )}
          </section>
          <ChatPanel onEmotion={changeEmotion} robotId={robotId} serverVoice={cfg.voice} onError={onError} prompt={chatPrompt} />
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
          {tab === 'routines' && (
            <RoutinesPanel
              onSettings={setSettings}
              onPlay={playActions}
              onError={onError}
              onNeedsFeed={() => feedRef.current.poll?.()}
            />
          )}
          {tab === 'games' && <GamesPanel onPlay={playGame} />}
          {tab === 'photos' && (
            <PhotosPanel
              photos={photos}
              settings={settings}
              onPhotos={loadPhotos}
              onSettings={setSettings}
              onPreview={() => showPhoto((settings?.framePhotoSec || 10) * 1000)}
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
