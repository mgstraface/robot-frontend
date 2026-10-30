import { useEffect, useState } from 'react';
import { api } from '../api.js';

/** Lo que Robi recuerda de vos a largo plazo (lo anota él solo cuando le contás algo importante). */
export default function MemoriesPanel({ onError }) {
  const [list, setList] = useState(null);
  const [text, setText] = useState('');

  useEffect(() => {
    api.memories().then(setList).catch(onError);
  }, [onError]);

  async function add(e) {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      setList(await api.addMemory(text.trim()));
      setText('');
    } catch (err) {
      onError(err);
    }
  }

  async function remove(id) {
    try {
      setList(await api.deleteMemory(id));
    } catch (err) {
      onError(err);
    }
  }

  return (
    <section className="memories">
      <h3>Lo que recuerda de vos</h3>
      <p className="hint">Lo anota solo cuando le contás algo importante. Podés agregar cosas o borrar lo que no quieras que sepa.</p>
      <form className="row" onSubmit={add}>
        <label htmlFor="mem-new" className="sr-only">
          Algo para que recuerde
        </label>
        <input id="mem-new" value={text} maxLength={200} placeholder="Ej.: mi novia se llama…" onChange={(e) => setText(e.target.value)} />
        <button type="submit" disabled={!text.trim()}>
          Agregar
        </button>
      </form>
      {!list && <p className="muted">Cargando…</p>}
      {list?.length === 0 && <p className="muted">Todavía no recuerda nada en particular.</p>}
      <ul className="memory-list">
        {list?.map((m) => (
          <li key={m._id}>
            <span>{m.text}</span>
            <button type="button" className="ghost small" onClick={() => remove(m._id)} aria-label={`Olvidar: ${m.text}`}>
              Olvidar
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
