import { useEffect, useState } from 'react';
import { speak } from '../speech.js';
import { api } from '../api.js';

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const WATER = [0, 30, 45, 60, 90, 120];
const NOTICE = [5, 10, 15, 30];
const pad = (h) => `${String(h).padStart(2, '0')}:00`;

function timeOf(ts, tz) {
  return new Date(ts).toLocaleTimeString('es-AR', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
}

/**
 * Rutinas: saludo con clima y agenda, horario de dormir, agua, modo susto, avisos de reuniones y deploys.
 * onPlay(actions, weather) muestra una animación en la cara grande.
 */
const VOCES = {
  'es-AR-TomasNeural': 'Tomás (argentino)',
  'es-AR-ElenaNeural': 'Elena (argentina)',
  'es-MX-JorgeNeural': 'Jorge (neutro)',
  'es-US-AlonsoNeural': 'Alonso (neutro)',
  'es-MX-DaliaNeural': 'Dalia (neutra)',
};

export default function RoutinesPanel({ onSettings, onPlay, onError, onNeedsFeed }) {
  const [saved, setSaved] = useState(null);
  const [form, setForm] = useState(null);
  const [calendarUrl, setCalendarUrl] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [weather, setWeather] = useState(null);
  const [events, setEvents] = useState(null);
  const [busy, setBusy] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    api
      .settings()
      .then((s) => {
        setSaved(s);
        setForm(s);
      })
      .catch(onError);
    api.weather().then(setWeather).catch(() => setWeather(null));
  }, [onError]);

  if (!form) return <p className="muted">Cargando…</p>;

  async function probarVoz() {
    setBusy('voz');
    try {
      await speak(`Hola ${form.ownerName || ''}, soy tu robot. ¿Te gusta cómo hablo?`, { serverVoice: true });
    } finally {
      setBusy('');
    }
  }

  const set = (patch) => {
    setStatus('');
    setForm({ ...form, ...patch });
  };

  const changed = {};
  for (const k of ['ownerName', 'sleepFrom', 'sleepTo', 'morningGreeting', 'scaresPerDay', 'waterEveryMin', 'meetingNoticeMin', 'deployReactions', 'futbol', 'frasesCadaHoras', 'voz', 'vozTono', 'timezone']) {
    if (form[k] !== saved[k]) changed[k] = form[k];
  }
  const frasesText = (form.frasesLeprosas || []).join('\n');
  if (frasesText !== (saved.frasesLeprosas || []).join('\n')) changed.frasesLeprosas = form.frasesLeprosas;
  if (form.city.name !== saved.city.name || form.city.lat !== saved.city.lat) changed.city = form.city;
  if (calendarUrl.trim()) changed.calendarUrl = calendarUrl.trim();
  const dirty = Object.keys(changed).length > 0;

  async function run(label, fn) {
    setBusy(label);
    try {
      await fn();
    } catch (err) {
      onError(err);
    } finally {
      setBusy('');
    }
  }

  const save = () =>
    run('save', async () => {
      const s = await api.saveSettings(changed);
      setSaved(s);
      setForm(s);
      setCalendarUrl('');
      onSettings(s);
      setStatus('Guardado.');
      if (changed.city) api.weather().then(setWeather).catch(() => {});
    });

  const search = (e) => {
    e.preventDefault();
    if (query.trim().length < 2) return;
    run('geo', async () => setResults(await api.geo(query.trim())));
  };

  return (
    <div className="routines">
      <h3>Vos</h3>
      <label htmlFor="owner">Cómo te llama</label>
      <input id="owner" value={form.ownerName} maxLength={40} onChange={(e) => set({ ownerName: e.target.value })} />

      <label htmlFor="voz">Voz del robot</label>
      <div className="row">
        <select id="voz" value={form.voz || 'es-AR-TomasNeural'} onChange={(e) => set({ voz: e.target.value })}>
          {Object.entries(VOCES).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
        <select value={form.vozTono || 'normal'} onChange={(e) => set({ vozTono: e.target.value })} aria-label="Tono">
          <option value="normal">Tono normal</option>
          <option value="agudo">Más agudo</option>
          <option value="grave">Más grave</option>
        </select>
        <button type="button" className="ghost" onClick={probarVoz} disabled={busy === 'voz'}>
          {busy === 'voz' ? 'Hablando…' : 'Escuchar'}
        </button>
      </div>
      <p className="hint">Voces gratis de Microsoft. Guardá para que el robot use la nueva; "Escuchar" prueba la que está guardada.</p>

      <h3>Saludo y clima</h3>
      <p className="hint">
        Cuando se despierta te saluda con la hora, el clima y lo que tenés en el calendario, y muestra el clima animado en la cara.
      </p>
      <label className="check">
        <input type="checkbox" checked={form.morningGreeting} onChange={(e) => set({ morningGreeting: e.target.checked })} />
        Saludarme al despertarse
      </label>
      <label htmlFor="city">Ciudad: {form.city.name}</label>
      <form className="inline" onSubmit={search}>
        <input id="city" value={query} placeholder="Buscar otra ciudad…" onChange={(e) => setQuery(e.target.value)} style={{ flex: 1, minWidth: 160 }} />
        <button type="submit" className="ghost" disabled={busy === 'geo'}>
          Buscar
        </button>
      </form>
      {results && (
        <ul className="results">
          {results.length === 0 && <li className="muted">Sin resultados.</li>}
          {results.map((r) => (
            <li key={`${r.lat},${r.lon}`}>
              <button
                type="button"
                onClick={() => {
                  set({ city: { name: r.name, lat: r.lat, lon: r.lon }, ...(r.timezone ? { timezone: r.timezone } : {}) });
                  setResults(null);
                  setQuery('');
                }}
              >
                {r.name} <span className="muted">· {r.region}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {weather && (
        <p className="hint">
          Ahora en {weather.city}: {weather.temp}°C, {weather.category} (máx. {weather.max}°, mín. {weather.min}°).
        </p>
      )}
      <div className="inline" style={{ marginTop: '0.4rem' }}>
        <button
          type="button"
          className="ghost"
          disabled={busy === 'brief'}
          onClick={() =>
            run('brief', async () => {
              await api.briefing();
              onNeedsFeed();
            })
          }
        >
          {busy === 'brief' ? 'Pensando…' : 'Saludar ahora'}
        </button>
        {weather && (
          <button type="button" className="ghost" onClick={() => onPlay(['clima'], weather.category)}>
            Ver clima en la cara
          </button>
        )}
      </div>

      <h3>Horario de dormir</h3>
      <div className="inline">
        <span>De</span>
        <select value={form.sleepFrom} onChange={(e) => set({ sleepFrom: Number(e.target.value) })} aria-label="Se duerme a las">
          {HOURS.map((h) => (
            <option key={h} value={h}>
              {pad(h)}
            </option>
          ))}
        </select>
        <span>a</span>
        <select value={form.sleepTo} onChange={(e) => set({ sleepTo: Number(e.target.value) })} aria-label="Se despierta a las">
          {HOURS.map((h) => (
            <option key={h} value={h}>
              {pad(h)}
            </option>
          ))}
        </select>
      </div>
      <p className="hint">En ese horario duerme, no avisa nada y no asusta.</p>

      <h3>Agua</h3>
      <div className="inline">
        <select value={form.waterEveryMin} onChange={(e) => set({ waterEveryMin: Number(e.target.value) })} aria-label="Recordatorio de agua">
          {WATER.map((m) => (
            <option key={m} value={m}>
              {m === 0 ? 'Sin recordatorio' : `Cada ${m} minutos`}
            </option>
          ))}
        </select>
      </div>

      <h3>Modo susto</h3>
      <p className="hint">Apagón y risa macabra a horas al azar. Solo con la cara en estilo Terror.</p>
      <div className="inline">
        <select value={form.scaresPerDay} onChange={(e) => set({ scaresPerDay: Number(e.target.value) })} aria-label="Sustos por día">
          {[0, 1, 2, 3, 4, 5, 6].map((n) => (
            <option key={n} value={n}>
              {n === 0 ? 'Apagado' : `${n} por día`}
            </option>
          ))}
        </select>
        <button type="button" className="ghost" onClick={() => onPlay(['apagon', 'risa'])}>
          Probar susto
        </button>
      </div>

      <h3>Reuniones</h3>
      <p className="hint">
        Pegá la dirección secreta iCal de tu calendario. En Google Calendar: Configuración → tu calendario → "Dirección secreta en formato
        iCal". Es privada: no se muestra después de guardarla.
      </p>
      <label htmlFor="ical">{form.hasCalendar ? `Calendario conectado (${form.calendarPreview}). Para cambiarlo, pegá otra:` : 'Dirección iCal'}</label>
      <input
        id="ical"
        type="password"
        autoComplete="off"
        value={calendarUrl}
        placeholder="https://calendar.google.com/calendar/ical/…/basic.ics"
        onChange={(e) => {
          setStatus('');
          setCalendarUrl(e.target.value);
        }}
      />
      <div className="inline" style={{ marginTop: '0.4rem' }}>
        <span>Avisar</span>
        <select value={form.meetingNoticeMin} onChange={(e) => set({ meetingNoticeMin: Number(e.target.value) })} aria-label="Minutos antes">
          {NOTICE.map((m) => (
            <option key={m} value={m}>
              {m} min antes
            </option>
          ))}
        </select>
        {saved.hasCalendar && (
          <button type="button" className="ghost" disabled={busy === 'cal'} onClick={() => run('cal', async () => setEvents((await api.calendarUpcoming()).events))}>
            Ver próximas
          </button>
        )}
        {saved.hasCalendar && (
          <button type="button" className="ghost" onClick={() => run('save', async () => {
            const s = await api.saveSettings({ calendarUrl: '' });
            setSaved(s);
            setForm(s);
            setEvents(null);
          })}>
            Desconectar
          </button>
        )}
      </div>
      {events && (
        <ul className="mini-list">
          {events.length === 0 && <li>Nada en las próximas 24 horas.</li>}
          {events.map((e) => (
            <li key={`${e.uid}${e.start}`}>
              {timeOf(e.start, saved.timezone)} · {e.summary}
            </li>
          ))}
        </ul>
      )}

      <h3>Deploys</h3>
      <label className="check">
        <input type="checkbox" checked={form.deployReactions} onChange={(e) => set({ deployReactions: e.target.checked })} />
        Festejar o llorar según cómo salen los deploys
      </label>

      <h3>Newell's</h3>
      <label className="check">
        <input type="checkbox" checked={form.futbol !== false} onChange={(e) => set({ futbol: e.target.checked })} />
        Hincha de la Lepra: avisa los partidos, festeja los goles y chicanea cuando pierde Central
      </label>
      {form.futbol !== false && (
        <>
          <label htmlFor="frases-cada">Frases leprosas</label>
          <select id="frases-cada" value={form.frasesCadaHoras ?? 3} onChange={(e) => set({ frasesCadaHoras: Number(e.target.value) })}>
            <option value={0}>Nunca</option>
            <option value={1}>Cada hora, más o menos</option>
            <option value={3}>Cada 3 horas, más o menos</option>
            <option value={6}>Cada 6 horas, más o menos</option>
          </select>
          <label htmlFor="frases">Tus frases y cantitos (una por línea)</label>
          <textarea
            id="frases"
            rows={5}
            value={frasesText}
            placeholder="Si lo dejás vacío usa las de fábrica. Podés escribir tus cantitos de la cancha."
            onChange={(e) => set({ frasesLeprosas: e.target.value.split('\n').slice(0, 50) })}
          />
          <p className="hint">También se las podés pedir: "Robi, cantá algo de Newell's".</p>
        </>
      )}

      <div className="row">
        <button type="button" onClick={save} disabled={!dirty || busy === 'save'}>
          {busy === 'save' ? 'Guardando…' : 'Guardar'}
        </button>
        {dirty && (
          <button
            type="button"
            className="ghost"
            onClick={() => {
              setForm(saved);
              setCalendarUrl('');
            }}
          >
            Descartar
          </button>
        )}
        {status && <span className="ok">{status}</span>}
      </div>
    </div>
  );
}
