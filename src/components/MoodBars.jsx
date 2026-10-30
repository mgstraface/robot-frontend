import { useEffect, useState } from 'react';
import { api } from '../api.js';

const BARS = [
  { key: 'energia', label: 'Energía' },
  { key: 'humor', label: 'Humor' },
  { key: 'atencion', label: 'Ganas de atención' },
];

/** Estado de ánimo de Robi (lo calcula el servidor; se actualiza cada 20 s o cuando cambia algo). */
export default function MoodBars({ bump }) {
  const [mood, setMood] = useState(null);
  useEffect(() => {
    let alive = true;
    const load = () => api.mood().then((m) => alive && setMood(m)).catch(() => {});
    load();
    const id = setInterval(load, 20000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [bump]);
  if (!mood) return null;
  return (
    <div className="mood" aria-label={`Ánimo: ${mood.descripcion}`}>
      {BARS.map((b) => (
        <div key={b.key} className="mood-row">
          <span>{b.label}</span>
          <div className="mood-track" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(mood[b.key])} aria-label={b.label}>
            <div className={`mood-fill m-${b.key}`} style={{ width: `${mood[b.key]}%` }} />
          </div>
        </div>
      ))}
      <p className="mood-text">Se siente {mood.descripcion}.</p>
    </div>
  );
}
