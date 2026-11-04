import { useState } from 'react';
import { api } from '../api.js';
import Face from './Face.jsx';

const COLORS = [
  { hex: '#5ef2ff', name: 'Cian' },
  { hex: '#d93a2b', name: 'Rojo sangre' },
  { hex: '#9be36b', name: 'Verde ácido' },
  { hex: '#f2c14e', name: 'Ámbar' },
  { hex: '#a970ff', name: 'Violeta' },
  { hex: '#f2e8c9', name: 'Hueso' },
];

const STYLES = [
  { id: 'tierno', label: 'Tierno', hint: 'Ojos redondos, tararea y juega' },
  { id: 'terror', label: 'Terror', hint: 'Ojos que brillan, acecha y tiene glitches' },
];

/**
 * Color de las facciones y estilo de cara. Los cambios se ven al instante en la cara grande
 * (onPreview) y se guardan con "Guardar"; ahí también le llegan al robot conectado.
 */
export default function AppearancePanel({ saved, draft, onPreview, onSaved, onError }) {
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const current = draft || saved;
  const dirty = Boolean(draft) && (draft.eyeColor !== saved.eyeColor || draft.faceStyle !== saved.faceStyle);

  function change(patch) {
    setStatus('');
    onPreview({ ...current, ...patch });
  }

  async function save() {
    setSaving(true);
    try {
      const p = await api.savePersonality({ eyeColor: current.eyeColor, faceStyle: current.faceStyle });
      onSaved({ eyeColor: p.eyeColor, faceStyle: p.faceStyle });
      setStatus('Guardado. Si el robot está conectado, ya cambió de cara.');
    } catch (err) {
      onError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="appearance">
      <label>Color de las facciones</label>
      <div className="swatches" role="group" aria-label="Color de las facciones">
        {COLORS.map((c) => (
          <button
            key={c.hex}
            type="button"
            className={`swatch ${current.eyeColor === c.hex ? 'active' : ''}`}
            style={{ background: c.hex }}
            onClick={() => change({ eyeColor: c.hex })}
            aria-label={c.name}
            aria-pressed={current.eyeColor === c.hex}
            title={c.name}
          />
        ))}
        <input
          type="color"
          className="swatch-custom"
          value={current.eyeColor}
          onChange={(e) => change({ eyeColor: e.target.value })}
          aria-label="Otro color"
          title="Otro color"
        />
      </div>

      <label>Estilo de cara</label>
      <div className="styles" role="group" aria-label="Estilo de cara">
        {STYLES.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`style-option ${current.faceStyle === s.id ? 'active' : ''}`}
            onClick={() => change({ faceStyle: s.id })}
            aria-pressed={current.faceStyle === s.id}
          >
            <Face size={140} eyeColor={current.eyeColor} faceStyle={s.id} />
            <strong>{s.label}</strong>
            <span className="hint">{s.hint}</span>
          </button>
        ))}
      </div>

      <div className="row">
        <button type="button" onClick={save} disabled={!dirty || saving}>
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
        {dirty && (
          <button type="button" className="ghost" onClick={() => onPreview(null)}>
            Descartar
          </button>
        )}
        {status && <span className="ok">{status}</span>}
      </div>
    </div>
  );
}
