import { useEffect, useState } from 'react';
import { api } from '../api.js';

const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** Asistente de cocina: recetas guardadas, carga (formato Robi o con IA) y el paso a paso en curso. */
export default function CocinaPanel({ cocina, onCocina, onError }) {
  const [recetas, setRecetas] = useState(null);
  const [formato, setFormato] = useState(null);
  const [text, setText] = useState('');
  const [nombre, setNombre] = useState('');
  const [busy, setBusy] = useState('');
  const [copied, setCopied] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    api.recetas().then(setRecetas).catch(onError);
    api.recetaFormato().then(setFormato).catch(() => {});
  }, [onError]);
  // refresco de las cuentas regresivas
  useEffect(() => {
    if (!cocina?.timers?.length) return undefined;
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [cocina]);

  async function run(label, fn) {
    setBusy(label);
    try {
      return await fn();
    } catch (err) {
      onError(err);
      return null;
    } finally {
      setBusy('');
    }
  }

  async function cargar(conIA) {
    const r = await run(conIA ? 'ia' : 'cargar', () => api.addReceta({ text, nombre: nombre.trim() || undefined, conIA }));
    if (r) {
      setRecetas((list) => [r, ...(list || [])]);
      setText('');
      setNombre('');
    }
  }

  async function copiarPrompt() {
    try {
      await navigator.clipboard.writeText(formato.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt('Copiá este texto:', formato.prompt);
    }
  }

  const accion = (a) => run(a, async () => onCocina(await api.cocinaAccion(a)));
  const paso = cocina?.activa && cocina.paso >= 0 ? cocina.receta.pasos[cocina.paso] : null;

  return (
    <div className="cocina">
      {cocina?.activa && (
        <section className="cocina-activa" aria-live="polite">
          <h3>Cocinando: {cocina.receta.nombre}</h3>
          {paso ? (
            <p className="cocina-paso">
              <small>
                Paso {cocina.paso + 1} de {cocina.receta.pasos.length}
              </small>
              {paso.texto}
            </p>
          ) : (
            <div>
              <p className="hint">Ingredientes:</p>
              <ul className="ingredientes">
                {cocina.receta.ingredientes.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </div>
          )}
          {cocina.timers.length > 0 && (
            <ul className="cocina-timers">
              {cocina.timers.map((t) => (
                <li key={t.id}>
                  <span>{t.label}</span>
                  <strong>{mmss(Math.max(0, Math.round((t.endsAt - Date.now()) / 1000)))}</strong>
                </li>
              ))}
            </ul>
          )}
          <div className="row wrap">
            <button type="button" className="ghost" onClick={() => accion('anterior')} disabled={!!busy || cocina.paso <= 0}>
              Anterior
            </button>
            <button type="button" className="ghost" onClick={() => accion('repetir')} disabled={!!busy || cocina.paso < 0}>
              Repetir
            </button>
            <button type="button" onClick={() => accion('siguiente')} disabled={!!busy}>
              {cocina.paso < 0 ? 'Arrancar' : 'Siguiente'}
            </button>
            <button type="button" className="ghost" onClick={() => accion('faltan')} disabled={!!busy}>
              ¿Cuánto falta?
            </button>
            <button type="button" className="danger" onClick={() => run('stop', async () => onCocina(await api.cocinaAccion('stop')))}>
              Terminar
            </button>
          </div>
          <p className="hint">En el robot: un toque en la pantalla pasa al siguiente paso. Con micrófono: "siguiente", "repetí", "¿cuánto falta?".</p>
        </section>
      )}

      <h3>Recetas</h3>
      {!recetas && <p className="muted">Cargando…</p>}
      {recetas?.length === 0 && <p className="muted">Todavía no hay recetas. Cargá la primera abajo.</p>}
      <ul className="recetas">
        {recetas?.map((r) => (
          <li key={r._id}>
            <div>
              <strong>{r.nombre}</strong>
              <small>
                {r.pasos.length} pasos{r.porciones ? ` · ${r.porciones} porciones` : ''}
              </small>
            </div>
            <div className="row">
              <button type="button" className="small" onClick={() => run('start', async () => onCocina(await api.cocinaStart(r._id)))}>
                Cocinar
              </button>
              <button
                type="button"
                className="ghost small"
                aria-label={`Borrar ${r.nombre}`}
                onClick={() => run('del', async () => {
                  await api.deleteReceta(r._id);
                  setRecetas((list) => list.filter((x) => x._id !== r._id));
                })}
              >
                Borrar
              </button>
            </div>
          </li>
        ))}
      </ul>

      <h3>Cargar una receta</h3>
      <p className="hint">
        Dos formas: pegás una receta en el <strong>formato Robi</strong> (gratis) o pegás cualquier receta y tocás <strong>Ordenar con IA</strong> (usa
        un poquito de crédito). Para no gastar, pedísela a ChatGPT o a Claude con las instrucciones de abajo.
      </p>
      {formato && (
        <div className="row wrap">
          <button type="button" className="ghost small" onClick={copiarPrompt}>
            {copied ? '¡Copiado!' : 'Copiar instrucciones para ChatGPT / Claude'}
          </button>
          <button type="button" className="ghost small" onClick={() => setText(formato.ejemplo)}>
            Ver un ejemplo
          </button>
        </div>
      )}
      <label htmlFor="receta-nombre">Nombre (opcional)</label>
      <input id="receta-nombre" value={nombre} maxLength={120} onChange={(e) => setNombre(e.target.value)} />
      <label htmlFor="receta-texto">Receta</label>
      <textarea id="receta-texto" rows={10} value={text} onChange={(e) => setText(e.target.value)} placeholder={'Poner a hervir el agua con sal\nEchar los fideos [10 min] | ¡Colá los fideos!'} />
      <div className="row wrap">
        <button type="button" onClick={() => cargar(false)} disabled={!text.trim() || !!busy}>
          {busy === 'cargar' ? 'Cargando…' : 'Cargar (formato Robi)'}
        </button>
        <button type="button" className="ghost" onClick={() => cargar(true)} disabled={!text.trim() || !!busy}>
          {busy === 'ia' ? 'Ordenando…' : 'Ordenar con IA'}
        </button>
      </div>
    </div>
  );
}
