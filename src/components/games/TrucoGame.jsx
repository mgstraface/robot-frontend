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

const HOLD_MS = 600; // mantener apretado = restar uno
const RESET_MS = 2500; // mantener el medio = nueva partida

/**
 * Anotador de truco pensado para la pantalla táctil del robot (sin botones):
 * tocar la mitad izquierda suma 1 a "Nos", la derecha a "Ellos";
 * mantener apretado resta 1; mantener el centro (la línea) un rato empieza otra partida.
 */
export default function TrucoGame({ eyeColor, faceStyle, onExit }) {
  const [st, setSt] = useState(load);
  const [pop, setPop] = useState(null); // { team, text } cartelito "+1" / "−1"
  const [msg, setMsg] = useState('');
  const press = useRef(null);
  const popTimer = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(st));
    } catch {
      /* sin almacenamiento */
    }
  }, [st]);
  useEffect(() => () => {
    clearTimeout(popTimer.current);
    clearTimeout(press.current?.t);
  }, []);

  function showPop(team, text) {
    clearTimeout(popTimer.current);
    setPop({ team, text, id: Date.now() });
    popTimer.current = setTimeout(() => setPop(null), 700);
  }

  function add(team, delta) {
    setSt((s) => {
      const before = s[team];
      const after = Math.max(0, Math.min(s.meta, before + delta));
      if (after === before) return s;
      const half = s.meta / 2;
      if (after === s.meta) setMsg(team === 'nos' ? '¡GANAMOS!' : 'Ganaron ellos… revancha');
      else if (s.meta === 30 && before < half && after >= half) setMsg(team === 'nos' ? 'Entramos en las buenas' : 'Ellos entraron en las buenas');
      else setMsg('');
      return { ...s, [team]: after };
    });
    showPop(team, delta > 0 ? '+1' : '−1');
  }

  function reset(meta = st.meta) {
    setSt({ nos: 0, ellos: 0, meta });
    setMsg('Partida nueva');
  }

  // Toques: corto = +1, largo = −1. En el centro, largo = partida nueva.
  function down(zone, e) {
    e.stopPropagation();
    clearTimeout(press.current?.t);
    const held = zone === 'centro' ? RESET_MS : HOLD_MS;
    press.current = {
      zone,
      done: false,
      t: setTimeout(() => {
        press.current.done = true;
        if (zone === 'centro') reset();
        else add(zone, -1);
      }, held),
    };
  }
  function up(e) {
    e.stopPropagation();
    const p = press.current;
    if (!p) return;
    clearTimeout(p.t);
    if (!p.done && p.zone !== 'centro') add(p.zone, 1);
    press.current = null;
  }
  function cancel() {
    clearTimeout(press.current?.t);
    press.current = null;
  }

  const half = st.meta / 2;
  const phase = (p) => (st.meta === 15 ? `${p}` : p <= half ? `${p} malas` : `${p - half} buenas`);
  const zone = (name, x, w) => (
    <rect
      x={x}
      y="0"
      width={w}
      height="180"
      className="truco-zone"
      onPointerDown={(e) => down(name, e)}
      onPointerUp={up}
      onPointerLeave={cancel}
      onClick={(e) => e.stopPropagation()}
    />
  );

  return (
    <>
      <Face size={340} eyeColor={eyeColor} faceStyle={faceStyle}>
        <g className="truco">
          <text className="truco-title" x="60" y="22" textAnchor="middle">NOS</text>
          <text className="truco-title" x="180" y="22" textAnchor="middle">ELLOS</text>
          <line className="truco-sep" x1="120" y1="10" x2="120" y2="170" />
          {st.meta === 30 && <line className="truco-sep" x1="24" y1="98" x2="216" y2="98" />}
          <Column x={52} points={st.nos} meta={st.meta} />
          <Column x={172} points={st.ellos} meta={st.meta} />
          {pop && (
            <text key={pop.id} className="truco-pop" x={pop.team === 'nos' ? 96 : 216} y="60" textAnchor="middle">
              {pop.text}
            </text>
          )}
          {msg && (
            <text className="truco-msg" x="120" y="172" textAnchor="middle">
              {msg}
            </text>
          )}
          {zone('nos', 0, 110)}
          {zone('ellos', 130, 110)}
          {zone('centro', 110, 20)}
        </g>
      </Face>

      <p className="game-score" aria-live="polite">
        Nos {phase(st.nos)} · Ellos {phase(st.ellos)}
      </p>
      <p className="hint">
        Igual que en el robot: tocá tu lado para sumar 1 (tocá dos veces para 2), mantené apretado para restar 1, y mantené la línea del medio
        para empezar otra partida.
      </p>
      <div className="game-controls">
        <button type="button" className="ghost" onClick={() => reset(st.meta === 30 ? 15 : 30)}>
          Jugar a {st.meta === 30 ? 15 : 30}
        </button>
        <button type="button" className="ghost" onClick={onExit}>
          Salir
        </button>
      </div>
    </>
  );
}
