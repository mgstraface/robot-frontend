import { useEffect, useRef, useState } from 'react';
import Face from '../Face.jsx';

// Ta-te-ti en la pantalla: vos sos la X (tocás la casilla), el robot la O.
const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];
const CELL = 42;
const X0 = 120 - CELL * 1.5;
const Y0 = 90 - CELL * 1.5;

const PHRASES = {
  tierno: {
    gana: ['¡Gané! ¿Otra?', '¡Ta-te-ti, suerte para mí!', 'Je, te gané'],
    pierde: ['¡Me ganaste!', 'Uh… revancha', 'Sos muy bueno'],
    empate: ['¡Empate!', 'Nadie gana…', 'Pensamos igual'],
  },
  terror: {
    gana: ['Era inevitable…', 'Tu alma es mía', 'Siempre gano'],
    pierde: ['Esto no termina acá', 'Te voy a visitar…', 'Disfrutalo… mientras puedas'],
    empate: ['Interesante…', 'Volvé a intentarlo… si te animás'],
  },
};
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export function winner(b) {
  for (const [a, c, d] of LINES) if (b[a] && b[a] === b[c] && b[a] === b[d]) return { who: b[a], line: [a, c, d] };
  return b.every(Boolean) ? { who: 'empate', line: null } : null;
}

/** Jugada del robot: gana si puede, si no bloquea, si no centro/esquinas. A veces se distrae (para que se le pueda ganar). */
export function robotMove(b, distraction = 0.25) {
  const free = b.map((v, i) => (v ? null : i)).filter((i) => i !== null);
  if (!free.length) return null;
  if (Math.random() < distraction) return free[Math.floor(Math.random() * free.length)];
  for (const mark of ['O', 'X']) {
    for (const i of free) {
      const t = [...b];
      t[i] = mark;
      if (winner(t)?.who === mark) return i;
    }
  }
  if (free.includes(4)) return 4;
  const corners = [0, 2, 6, 8].filter((i) => free.includes(i));
  if (corners.length) return pick(corners);
  return pick(free);
}

export default function TatetiGame({ eyeColor, faceStyle, onExit }) {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [turn, setTurn] = useState('X');
  const [end, setEnd] = useState(null); // { who, line, phrase }
  const [score, setScore] = useState({ vos: 0, robot: 0 });
  const [showFace, setShowFace] = useState(false);
  const timers = useRef([]);
  const tone = PHRASES[faceStyle] || PHRASES.tierno;

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (ms, fn) => timers.current.push(setTimeout(fn, ms));

  function finish(b) {
    const w = winner(b);
    if (!w) return false;
    const result = w.who === 'O' ? 'gana' : w.who === 'X' ? 'pierde' : 'empate';
    setEnd({ ...w, result, phrase: pick(tone[result]) });
    setScore((s) => ({ vos: s.vos + (result === 'pierde' ? 1 : 0), robot: s.robot + (result === 'gana' ? 1 : 0) }));
    later(1400, () => setShowFace(true));
    return true;
  }

  function play(i) {
    if (turn !== 'X' || board[i] || end) return;
    const b = [...board];
    b[i] = 'X';
    setBoard(b);
    if (finish(b)) return;
    setTurn('O');
    later(700, () => {
      const j = robotMove(b);
      const b2 = [...b];
      b2[j] = 'O';
      setBoard(b2);
      if (!finish(b2)) setTurn('X');
    });
  }

  function reset() {
    timers.current.forEach(clearTimeout);
    setBoard(Array(9).fill(null));
    setEnd(null);
    setShowFace(false);
    setTurn(Math.random() < 0.5 ? 'X' : 'O');
  }

  // si arranca el robot
  useEffect(() => {
    if (turn === 'O' && board.every((v) => !v) && !end) {
      later(700, () => {
        const b = Array(9).fill(null);
        b[robotMove(b, 0.5)] = 'O';
        setBoard(b);
        setTurn('X');
      });
    }
  }, [turn]); // eslint-disable-line react-hooks/exhaustive-deps

  const reaction = end && { gana: 'riendo', pierde: faceStyle === 'terror' ? 'enojado' : 'triste', empate: 'sorprendido' }[end.result];
  const center = (i) => ({ x: X0 + (i % 3) * CELL + CELL / 2, y: Y0 + Math.floor(i / 3) * CELL + CELL / 2 });

  return (
    <>
      {showFace ? (
        <Face size={340} eyeColor={eyeColor} faceStyle={faceStyle} emotion={reaction} />
      ) : (
        <Face size={340} eyeColor={eyeColor} faceStyle={faceStyle}>
          <g className="tateti">
            {[1, 2].map((k) => (
              <g key={k}>
                <line className="tateti-grid" x1={X0 + k * CELL} y1={Y0 + 4} x2={X0 + k * CELL} y2={Y0 + 3 * CELL - 4} />
                <line className="tateti-grid" x1={X0 + 4} y1={Y0 + k * CELL} x2={X0 + 3 * CELL - 4} y2={Y0 + k * CELL} />
              </g>
            ))}
            {board.map((v, i) => {
              const { x, y } = center(i);
              return (
                <g key={i}>
                  <rect
                    x={x - CELL / 2}
                    y={y - CELL / 2}
                    width={CELL}
                    height={CELL}
                    className="tateti-cell"
                    onClick={(e) => {
                      e.stopPropagation();
                      play(i);
                    }}
                  />
                  {v === 'X' && <path className="tateti-x" d={`M${x - 11} ${y - 11} L${x + 11} ${y + 11} M${x + 11} ${y - 11} L${x - 11} ${y + 11}`} />}
                  {v === 'O' && <circle className="tateti-o" cx={x} cy={y} r="12" />}
                </g>
              );
            })}
            {end?.line && (
              <line
                className="tateti-win"
                x1={center(end.line[0]).x}
                y1={center(end.line[0]).y}
                x2={center(end.line[2]).x}
                y2={center(end.line[2]).y}
              />
            )}
          </g>
        </Face>
      )}

      <p className="game-score" aria-live="polite">
        Vos {score.vos} · {score.robot} Robot — {end ? end.phrase : turn === 'X' ? 'te toca (sos la X)' : 'está pensando…'}
      </p>
      <div className="game-controls">
        <button type="button" onClick={reset}>
          {end ? 'Otra' : 'Empezar de nuevo'}
        </button>
        <button type="button" className="ghost" onClick={onExit}>
          Salir
        </button>
      </div>
    </>
  );
}
