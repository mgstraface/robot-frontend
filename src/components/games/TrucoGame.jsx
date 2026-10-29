import { useEffect, useRef, useState } from 'react';
import Face from '../Face.jsx';

// Anotador de truco con fósforos: cada grupo de 5 es un cuadrado (4 lados) cruzado por una diagonal.
// Hasta 15 son "las malas", de 16 a 30 "las buenas".
const KEY = 'robot_truco';

function load() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY));
    if (v && Number.isFinite(v.nos) && Number.isFinite(v.ellos)) return v;
  } catch {
    /* sin almacenamiento */
  }
  return { nos: 0, ellos: 0, meta: 30 };
}

const S = 16; // lado del cuadradito

/** Los fósforos de un grupo con n palitos (1–5), con su esquina arriba a la izquierda en (x, y). */
function Group({ x, y, n }) {
  const sides = [
    `M${x} ${y} L${x} ${y + S}`, // izquierda
    `M${x} ${y} L${x + S} ${y}`, // arriba
    `M${x + S} ${y} L${x + S} ${y + S}`, // derecha
    `M${x} ${y + S} L${x + S} ${y + S}`, // abajo
    `M${x} ${y} L${x + S} ${y + S}`, // diagonal
  ];
  return (
    <g>
      {sides.slice(0, n).map((d, i) => (
        <path key={i} className="fosforo" d={d} />
      ))}
    </g>
  );
}

function Column({ x, points, meta }) {
  const groups = [];
  for (let g = 0; g < meta / 5; g++) {
    const n = Math.max(0, Math.min(5, points - g * 5));
    // 3 grupos por "mitad": arriba las malas, abajo las buenas
    const half = Math.floor(g / 3);
    const row = g % 3;
    const gy = 30 + row * (S + 4) + half * (3 * (S + 4) + 16);
    if (n) groups.push(<Group key={g} x={x} y={gy} n={n} />);
  }
  return <g>{groups}</g>;
}

export default function TrucoGame({ eyeColor, faceStyle, onExit }) {
  const [st, setSt] = useState(load);
  const [flash, setFlash] = useState(null); // emoción breve después de anotar
  const [msg, setMsg] = useState('');
  const timer = useRef(null);
  const terror = faceStyle === 'terror';

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(st));
    } catch {
      /* sin almacenamiento */
    }
  }, [st]);
  useEffect(() => () => clearTimeout(timer.current), []);

  function react(emotion, text, ms = 1300) {
    clearTimeout(timer.current);
    setFlash(emotion);
    setMsg(text);
    timer.current = setTimeout(() => setFlash(null), ms);
  }

  function add(team, delta) {
    setSt((s) => {
      const before = s[team];
      const after = Math.max(0, Math.min(s.meta, before + delta));
      if (after === before) return s;
      const next = { ...s, [team]: after };
      const half = s.meta / 2;
      if (delta > 0) {
        if (after === s.meta) {
          react(team === 'nos' ? 'riendo' : terror ? 'enojado' : 'triste', team === 'nos' ? '¡GANAMOS! ¡Qué paliza!' : 'Perdimos… revancha ya.', 4000);
        } else if (s.meta === 30 && before < half && after >= half) {
          react('sorprendido', team === 'nos' ? '¡Entramos en las buenas!' : 'Ellos ya están en las buenas…');
        } else if (team === 'nos') {
          react('feliz', delta >= 3 ? '¡Vamos todavía!' : '¡Bien ahí!');
        } else {
          react(terror ? 'enojado' : 'triste', delta >= 3 ? 'Uh… nos cantaron bien' : 'Mmm…');
        }
      }
      return next;
    });
  }

  function reset(meta = st.meta) {
    setSt({ nos: 0, ellos: 0, meta });
    setMsg('');
    setFlash(null);
  }

  const half = st.meta / 2;
  const phase = (p) => (st.meta === 15 ? `${p}` : p <= half ? `${p} malas` : `${p - half} buenas`);

  return (
    <>
      {flash ? (
        <Face size={340} eyeColor={eyeColor} faceStyle={faceStyle} emotion={flash} />
      ) : (
        <Face size={340} eyeColor={eyeColor} faceStyle={faceStyle}>
          <g className="truco">
            <text className="truco-title" x="60" y="22" textAnchor="middle">NOS</text>
            <text className="truco-title" x="180" y="22" textAnchor="middle">ELLOS</text>
            <line className="truco-sep" x1="120" y1="10" x2="120" y2="170" />
            {st.meta === 30 && <line className="truco-sep" x1="24" y1="98" x2="216" y2="98" />}
            <Column x={52} points={st.nos} meta={st.meta} />
            <Column x={172} points={st.ellos} meta={st.meta} />
          </g>
        </Face>
      )}

      <p className="game-score" aria-live="polite">
        Nos {phase(st.nos)} · Ellos {phase(st.ellos)}
        {msg && ` — ${msg}`}
      </p>
      <div className="game-controls truco-controls">
        <div className="truco-team">
          <strong>Nos</strong>
          <button type="button" onClick={() => add('nos', 1)}>+1</button>
          <button type="button" onClick={() => add('nos', 2)}>+2</button>
          <button type="button" onClick={() => add('nos', 3)}>+3</button>
          <button type="button" className="ghost" onClick={() => add('nos', -1)} aria-label="Restar uno a nosotros">−1</button>
        </div>
        <div className="truco-team">
          <strong>Ellos</strong>
          <button type="button" onClick={() => add('ellos', 1)}>+1</button>
          <button type="button" onClick={() => add('ellos', 2)}>+2</button>
          <button type="button" onClick={() => add('ellos', 3)}>+3</button>
          <button type="button" className="ghost" onClick={() => add('ellos', -1)} aria-label="Restar uno a ellos">−1</button>
        </div>
        <div className="truco-team">
          <button type="button" className="ghost" onClick={() => reset()}>Nueva partida</button>
          <button type="button" className="ghost" onClick={() => reset(st.meta === 30 ? 15 : 30)}>
            A {st.meta === 30 ? 15 : 30}
          </button>
          <button type="button" className="ghost" onClick={onExit}>Salir</button>
        </div>
      </div>
    </>
  );
}
