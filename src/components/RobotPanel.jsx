import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';

const SERVOS = [
  { id: 'pan', label: 'Cuello: giro (no)' },
  { id: 'tilt', label: 'Cuello: cabeceo (sí)' },
  { id: 'armL', label: 'Brazo izquierdo' },
  { id: 'armR', label: 'Brazo derecho' },
];
const TESTS = [
  { id: 'pantalla', label: 'Pantalla' },
  { id: 'audio', label: 'Audio' },
  { id: 'sensores', label: 'Sensores' },
  { id: 'servos', label: 'Servos (todos, despacio)' },
  { id: 'reiniciar', label: 'Reiniciar robot' },
];

function ago(iso) {
  if (!iso) return '—';
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `hace ${s} s`;
  if (s < 3600) return `hace ${Math.round(s / 60)} min`;
  return `hace ${Math.round(s / 3600)} h`;
}

function uptime(sec) {
  if (!Number.isFinite(sec)) return '—';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h ? `${h} h ${m} min` : `${m} min`;
}

/** Diagnóstico del robot y calibración de los servos (uno por vez, con STOP). */
export default function RobotPanel({ status, onError }) {
  const devices = status?.devices || [];
  const online = devices.length > 0;
  const [servos, setServos] = useState(null);
  const [saved, setSaved] = useState(null);
  const [sel, setSel] = useState('pan');
  const [angle, setAngle] = useState(90);
  const [msg, setMsg] = useState('');
  const sendTimer = useRef(null);

  useEffect(() => {
    api
      .settings()
      .then((s) => {
        setServos(s.servos);
        setSaved(s.servos);
        setAngle(s.servos?.pan?.centro ?? 90);
      })
      .catch(onError);
  }, [onError]);

  if (!servos) return <p className="muted">Cargando…</p>;
  const cal = servos[sel];
  const dirty = JSON.stringify(servos) !== JSON.stringify(saved);

  function move(a) {
    const v = Math.max(0, Math.min(180, Math.round(a)));
    setAngle(v);
    clearTimeout(sendTimer.current);
    // manda como mucho ~6 órdenes por segundo
    sendTimer.current = setTimeout(() => api.servo(sel, v).catch(onError), 150);
  }
  function stop() {
    clearTimeout(sendTimer.current);
    api.servoStop().catch(onError);
    setMsg('STOP enviado');
  }
  function setCal(patch) {
    setServos({ ...servos, [sel]: { ...cal, ...patch } });
  }
  function pick(id) {
    stop();
    setSel(id);
    setAngle(servos[id].centro);
    setMsg('');
  }
  async function save() {
    try {
      const s = await api.saveSettings({ servos });
      setServos(s.servos);
      setSaved(s.servos);
      setMsg('Calibración guardada y enviada al robot');
    } catch (err) {
      onError(err);
    }
  }
  const fuera = angle < cal.min || angle > cal.max;

  return (
    <div className="robot-panel">
      <h3>Diagnóstico</h3>
      {!online && <p className="muted">El robot no está conectado. Cuando se conecte vas a ver acá su estado.</p>}
      {devices.map((d) => (
        <dl key={d.deviceId} className="diag">
          <dt>Robot</dt>
          <dd>{d.deviceId}</dd>
          <dt>Conectado</dt>
          <dd>{ago(d.connectedAt)}</dd>
          <dt>Último contacto</dt>
          <dd>{ago(d.lastSeen)}</dd>
          <dt>Firmware</dt>
          <dd>{d.status?.firmware || '—'}</dd>
          <dt>Encendido hace</dt>
          <dd>{uptime(d.status?.uptime)}</dd>
          <dt>Último reinicio</dt>
          <dd>{d.status?.resetReason || '—'}</dd>
          <dt>Señal WiFi</dt>
          <dd>{Number.isFinite(d.status?.rssi) ? `${d.status.rssi} dBm` : '—'}</dd>
          <dt>Memoria libre</dt>
          <dd>{Number.isFinite(d.status?.heap) ? `${Math.round(d.status.heap / 1024)} KB` : '—'}</dd>
          <dt>Sensores</dt>
          <dd>{d.status?.sensores ? JSON.stringify(d.status.sensores) : '—'}</dd>
        </dl>
      ))}

      <div className="row wrap" role="group" aria-label="Pruebas">
        {TESTS.map((t) => (
          <button key={t.id} type="button" className="ghost small" disabled={!online} onClick={() => api.robotTest(t.id).catch(onError)}>
            {t.label}
          </button>
        ))}
      </div>

      <h3>Calibración de servos</h3>
      <p className="hint">
        Mueve un servo por vez, despacio. Buscá el centro y hasta dónde puede ir sin trabarse ni forzar, y guardalo. Ante cualquier ruido raro, STOP.
      </p>
      <div className="row wrap" role="group" aria-label="Servo">
        {SERVOS.map((s) => (
          <button key={s.id} type="button" className={`chip ${s.id === sel ? 'active' : ''}`} onClick={() => pick(s.id)}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="calib">
        <label htmlFor="angle">
          Ángulo: <strong>{angle}°</strong> {fuera && <span className="warn">fuera de los límites guardados</span>}
        </label>
        <input id="angle" type="range" min={0} max={180} value={angle} disabled={!online} onChange={(e) => move(Number(e.target.value))} />
        <div className="row wrap">
          {[-5, -1, 1, 5].map((d) => (
            <button key={d} type="button" className="ghost small" disabled={!online} onClick={() => move(angle + d)}>
              {d > 0 ? `+${d}` : d}°
            </button>
          ))}
          <button type="button" className="danger stop" onClick={stop}>
            STOP
          </button>
        </div>

        <div className="row wrap">
          <button type="button" className="ghost small" onClick={() => setCal({ centro: Math.min(Math.max(angle, cal.min), cal.max) })}>
            Usar como centro
          </button>
          <button type="button" className="ghost small" onClick={() => setCal({ min: Math.min(angle, cal.centro) })}>
            Usar como mínimo
          </button>
          <button type="button" className="ghost small" onClick={() => setCal({ max: Math.max(angle, cal.centro) })}>
            Usar como máximo
          </button>
        </div>

        <p className="calib-values">
          Centro {cal.centro}° · mínimo {cal.min}° · máximo {cal.max}°
        </p>
        <label className="check">
          <input type="checkbox" checked={cal.invertido} onChange={(e) => setCal({ invertido: e.target.checked })} />
          Invertir sentido
        </label>
        <label htmlFor="vel">Velocidad máxima: {cal.vel}°/s</label>
        <input id="vel" type="range" min={30} max={360} step={10} value={cal.vel} onChange={(e) => setCal({ vel: Number(e.target.value) })} />

        <div className="row">
          <button type="button" onClick={save} disabled={!dirty}>
            Guardar calibración
          </button>
          {dirty && (
            <button type="button" className="ghost" onClick={() => setServos(saved)}>
              Descartar
            </button>
          )}
          {msg && <span className="muted">{msg}</span>}
        </div>
      </div>
    </div>
  );
}
