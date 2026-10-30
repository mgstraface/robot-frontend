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
import TatetiGame from './components/games/TatetiGame.jsx';
import TrucoGame from './components/games/TrucoGame.jsx';
import { ARM_LABELS, GESTURE_LABELS, useHead } from './head.js';
import Body from './components/Body.jsx';
import MoodBars from './components/MoodBars.jsx';
import RobotPanel from './components/RobotPanel.jsx';
import ScreenMenu, { MENU, Peek } from './components/ScreenMenu.jsx';
import { useTouchGestures } from './useTouchGestures.js';
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
  { id: 'gol', label: 'Gol de Newell\'s' },
  { id: 'frase', label: 'Frase leprosa' },
  { id: 'gol-rival', label: 'Gol de Central' },
  { id: 'victoria', label: 'Ganó Newell\'s' },
  { id: 'derrota', label: 'Perdió Newell\'s' },
  { id: 'central-perdio', label: 'Perdió Central' },
];
const TRIVIA_PROMPT =
  '¡Juguemos a una trivia de películas de terror! Haceme una pregunta por vez con tres opciones, esperá mi respuesta, decime si acerté y llevá la cuenta.';

const SINO_PROMPT =
  'Juguemos a "sí o no": yo te hago preguntas y vos respondés como una bola 8 mágica, misterioso y en una sola frase corta, siempre moviendo la cabeza (asentir o negar). Arrancá diciendo que estás listo.';

const KIND_LABELS = { fecha: 'Fecha', animo: 'Ánimo', futbol: "Newell's", timer: 'Timer', alarma: 'Alarma', recordatorio: 'Recordatorio', saludo: 'Saludo', reunion: 'Reunión', agua: 'Agua', foco: 'Foco', deploy: 'Deploy' };

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
  { id: 'robot', label: 'Robot' },
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
  // En Halloween el robot se pone en modo terror todo el día (salvo que estés probando otra apariencia)
  const baseLook = draftAppearance || appearance;
  const look = cfg?.halloween && !draftAppearance ? { ...baseLook, faceStyle: 'terror' } : baseLook;
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
  const [talking, setTalking] = useState(false);
  const [moodBump, setMoodBump] = useState(0);
  // Menú en la pantalla del robot (deslizar) y vistazo rápido (deslizar hacia abajo)
  const [menu, setMenu] = useState(null); // { level, index }
  const [peek, setPeek] = useState(null); // líneas de texto
  useEffect(() => {
    const on = (e) => setTalking(Boolean(e.detail));
    window.addEventListener('robot-talking', on);
    return () => window.removeEventListener('robot-talking', on);
  }, []);
  const head = useHead({ emotion, idle: life && emotion === 'neutral' && !action && !photo, faceStyle: look.faceStyle });

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
      if (item.gesture) head.playGesture(item.gesture);
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
    const id = setTimeout(() => setToast(''), toast.length > 80 ? 10000 : 5000);
    return () => clearTimeout(id);
  }, [toast]);


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
    api.moodEvent('juego').then(() => setMoodBump((n) => n + 1)).catch(() => {});
    if (id === 'trivia' || id === 'sino' || id === 'cuento') {
      const text = id === 'trivia' ? TRIVIA_PROMPT : id === 'sino' ? SINO_PROMPT : 'Robi, contame un cuento de terror.';
      setChatPrompt({ id: Date.now(), text });
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

  // Se cierran solos: el menú a los 10 s sin tocar nada, el vistazo a los 5 s
  useEffect(() => {
    if (!menu) return undefined;
    const t = setTimeout(() => setMenu(null), 10000);
    return () => clearTimeout(t);
  }, [menu]);
  useEffect(() => {
    if (!peek) return undefined;
    const t = setTimeout(() => setPeek(null), 5000);
    return () => clearTimeout(t);
  }, [peek]);

  async function showPeek() {
    const hora = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    const robot = status?.devices?.length ? 'Robot conectado' : 'Robot sin conexión';
    setPeek([hora, 'Clima: …', robot]);
    try {
      const w = await api.weather();
      setPeek((p) => p && [p[0], `${w.temp}° · ${w.category}`, p[2]]);
    } catch {
      /* queda sin clima */
    }
  }

  async function runMenuItem(item) {
    if (item.id === 'juegos') return setMenu({ level: 'juegos', index: 0 });
    if (item.id === 'volver') return setMenu({ level: 'main', index: 0 });
    setMenu(null);
    if (['tateti', 'ppt', 'ojo', 'truco'].includes(item.id)) return playGame(item.id);
    if (item.id === 'timer') return focus ? null : toggleFocus();
    if (item.id === 'clima') return tryRoutine('clima');
    if (item.id === 'fotos') return photos.length ? showPhoto(8000) : setPeek(['Sin fotos', 'Subilas en la pestaña Fotos']);
    if (item.id === 'modo') {
      const faceStyle = look.faceStyle === 'terror' ? 'tierno' : 'terror';
      try {
        const p = await api.savePersonality({ eyeColor: look.eyeColor, faceStyle });
        setAppearance({ eyeColor: p.eyeColor, faceStyle: p.faceStyle });
      } catch (err) {
        onError(err);
      }
      return null;
    }
    if (item.id === 'ajustes') return setPeek(['Brillo y volumen', 'Se ajustan en el robot', '(cuando esté armado)']);
    return null;
  }

  const gestures = useTouchGestures({
    onTap: (e) => {
      if (peek) return setPeek(null);
      if (menu) return runMenuItem(MENU[menu.level][menu.index]);
      return pet(e);
    },
    onTripleTap: () => {
      if (menu || peek) return;
      if (look.faceStyle === 'terror') playActions(['risa']);
      else changeEmotion('riendo');
      head.playGesture('bailar');
      api.moodEvent('mimo').then(() => setMoodBump((n) => n + 1)).catch(() => {});
    },
    onLongPress: () => {
      if (menu || peek) return;
      changeEmotion('escuchando');
      setPeek(['Te escucho…', '(con el micrófono armado)']);
    },
    onSwipe: (dir) => {
      setPeek(null);
      if (dir === 'arriba') return setMenu(null);
      if (dir === 'abajo') return menu ? setMenu(null) : showPeek();
      const items = MENU[menu?.level || 'main'];
      if (!menu) return setMenu({ level: 'main', index: 0 });
      const step = dir === 'izquierda' ? 1 : -1;
      return setMenu({ ...menu, index: (menu.index + step + items.length) % items.length });
    },
  });

  function pet(e) {
    changeEmotion(action === 'dormir' ? 'sorprendido' : 'amor');
    api.moodEvent('mimo').then(() => setMoodBump((n) => n + 1)).catch(() => {});
    // mira hacia el lado donde lo tocaron (como las zonas táctiles del robot)
    const r = e?.currentTarget?.getBoundingClientRect?.();
    if (r && e.clientX) {
      const side = ((e.clientX - r.left) / r.width - 0.5) * 2;
      if (Math.abs(side) > 0.3) head.glance(side * 45, 5, 2000);
    }
  }

  async function sendGesture(g) {
    head.playGesture(g);
    if (!robotId) return;
    try {
      await api.gesture(g);
    } catch (err) {
      onError(err);
    }
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

  if (checking) return null;
  if (!cfg) return <Login onLogin={setCfg} />;
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo" aria-hidden="true" />
          <h1>{name}</h1>
        </div>
        <div className="status-pills">
          {cfg.env === 'dev' && <span className="pill dev">Entorno de pruebas</span>}
          {cfg.halloween && <span className="pill halloween">Modo Halloween</span>}
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
            {game === 'truco' && <TrucoGame eyeColor={look.eyeColor} faceStyle={look.faceStyle} onExit={exitGame} />}
            {game === 'tateti' && <TatetiGame eyeColor={look.eyeColor} faceStyle={look.faceStyle} onExit={exitGame} />}
            {game === 'ojo' && <CatchGame eyeColor={look.eyeColor} faceStyle={look.faceStyle} onExit={exitGame} />}
            {!game && (
            <>
            <div className="stage-figure">
              <div className="head touchable" style={{ '--pan': `${head.pose.pan}deg`, '--tilt': `${head.pose.tilt}deg` }} {...gestures}>
                <div className={`head-gesture ${head.gesture ? `g-${head.gesture}` : ''}`}>
                  {menu ? (
                    <Face size={340} eyeColor={look.eyeColor} faceStyle={look.faceStyle}>
                      <ScreenMenu level={menu.level} index={menu.index} />
                    </Face>
                  ) : peek ? (
                    <Face size={340} eyeColor={look.eyeColor} faceStyle={look.faceStyle}>
                      <Peek lines={peek} />
                    </Face>
                  ) : (
                    <Face emotion={emotion} action={action} size={340} eyeColor={look.eyeColor} faceStyle={look.faceStyle} photo={photo} talking={talking && !action} />
                  )}
                </div>
              </div>
              <Body pose={head.pose} gesture={head.gesture} emotion={emotion} eyeColor={look.eyeColor} />
            </div>
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
            <div className="expressions gestures" role="group" aria-label="Movimientos de cabeza">
              {Object.entries({ ...GESTURE_LABELS, ...ARM_LABELS }).map(([g, label]) => (
                <button key={g} type="button" className="chip" onClick={() => sendGesture(g)}>
                  {label}
                </button>
              ))}
            </div>
            {announcement && (
              <p className="announce" role="status">
                {KIND_LABELS[announcement.kind] && <small>{KIND_LABELS[announcement.kind]}</small>}
                {announcement.text}
              </p>
            )}
            <MoodBars bump={moodBump} />
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
          <ChatPanel onEmotion={changeEmotion} onGesture={head.playGesture} robotId={robotId} serverVoice={cfg.voice} onError={onError} prompt={chatPrompt} />
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
          {tab === 'robot' && <RobotPanel status={status} onError={onError} />}
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
