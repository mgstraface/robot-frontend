import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { PRESETS } from '../presets.js';

export default function PersonalityPanel({ onSaved, onError }) {
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    api
      .getPersonality()
      .then((p) => {
        const data = { name: p.name, systemPrompt: p.systemPrompt };
        setForm(data);
        setSaved(data);
      })
      .catch(onError);
  }, [onError]);

  if (!form) return <p className="muted">Cargando…</p>;

  const dirty = form.name !== saved.name || form.systemPrompt !== saved.systemPrompt;

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setStatus('');
    try {
      const p = await api.savePersonality(form);
      const data = { name: p.name, systemPrompt: p.systemPrompt };
      setForm(data);
      setSaved(data);
      setStatus('Guardado. Se aplica desde el próximo mensaje.');
      onSaved?.(p);
    } catch (err) {
      onError(err);
    } finally {
      setSaving(false);
    }
  }

  function loadPreset(p) {
    setStatus('');
    setForm({ name: p.name || form.name, systemPrompt: p.systemPrompt });
  }

  return (
    <form className="personality" onSubmit={save}>
      <label>Cargar un carácter</label>
      <div className="presets" role="group" aria-label="Caracteres">
        {PRESETS.map((p) => (
          <button key={p.id} type="button" className="chip" onClick={() => loadPreset(p)}>
            {p.label}
          </button>
        ))}
      </div>

      <label htmlFor="pname">Nombre</label>
      <input id="pname" value={form.name} maxLength={40} onChange={(e) => setForm({ ...form, name: e.target.value })} />

      <label htmlFor="pprompt">Personalidad (prompt)</label>
      <textarea
        id="pprompt"
        rows={14}
        value={form.systemPrompt}
        onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
      />
      <p className="hint">
        Cómo habla, qué sabe de vos, qué le gusta. Cargar un carácter solo completa el formulario: revisalo y tocá Guardar. El formato de emociones lo agrega el servidor solo.
      </p>

      <div className="row">
        <button type="submit" disabled={!dirty || saving}>
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
        {dirty && (
          <button type="button" className="ghost" onClick={() => setForm(saved)}>
            Descartar
          </button>
        )}
        {status && <span className="ok">{status}</span>}
      </div>
    </form>
  );
}
