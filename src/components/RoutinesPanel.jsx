import { useEffect, useState } from 'react';
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

  const set = (patch) => {
    setStatus('');
    setForm({ ...form, ...patch });
  };

  const changed = {};
  for (const k of ['ownerName', 'sleepFrom', 'sleepTo', 'morningGreeting', 'scaresPerDay', 'waterEveryMin', 'meetingNoticeMin', 'deployReactions', 'timezone']) {
    if (form[k] !== saved[k]) changed[k] = form[k];
  }
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
