import { useEffect, useRef, useState } from 'react';
import Face from '../Face.jsx';

const DURATION = 20000;
const MOVE_MS = 850;
const RECORD_KEY = 'robot_catch_record';

function loadRecord() {
  try {
    return Number(localStorage.getItem(RECORD_KEY)) || 0;
  } catch {
    return 0;
  }
}

const randomSpot = () => ({ x: 34 + Math.random() * 172, y: 40 + Math.random() * 110, id: Math.random() });

/** Atrapá el ojo: aparece un ojo en lugares al azar y hay que tocarlo. En el robot, con la pantalla táctil. */
export default function CatchGame({ eyeColor, faceStyle, onExit }) {
  const [phase, setPhase] = useState('listo'); // listo · jugando · fin
  const [spot, setSpot] = useState(randomSpot);
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(DURATION);
  const [record, setRecord] = useState(loadRecord);
  const [newRecord, setNewRecord] = useState(false);
  const endsAt = useRef(0);

  useEffect(() => {
    if (phase !== 'jugando') return undefined;
    const move = setInterval(() => setSpot(randomSpot()), MOVE_MS);
    const clock = setInterval(() => {
      const ms = endsAt.current - Date.now();
      setLeft(Math.max(0, ms));
      if (ms <= 0) setPhase('fin');
    }, 100);
    return () => {
      clearInterval(move);
      clearInterval(clock);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== 'fin') return;
    if (score > record) {
      setRecord(score);
      setNewRecord(true);
      try {
        localStorage.setItem(RECORD_KEY, String(score));
      } catch {
        /* sin storage */
      }
    }
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  function start() {
    setScore(0);
    setNewRecord(false);
    setSpot(randomSpot());
    endsAt.current = Date.now() + DURATION;
    setLeft(DURATION);
    setPhase('jugando');
  }

  function hit(e) {
    e.stopPropagation();
    setScore((s) => s + 1);
    setSpot(randomSpot());
  }

  return (
    <>
      {phase === 'jugando' ? (
        <Face size={340} eyeColor={eyeColor} faceStyle={faceStyle}>
          <rect className="time-bar" x="30" y="10" width={(180 * left) / DURATION} height="5" rx="2.5" />
          <text className="game-text" x="30" y="34">
            {score}
          </text>
          <g key={spot.id} className="target-pop">
            <circle className="eye target" cx={spot.x} cy={spot.y} r="20" onClick={hit} />
            <circle className="pupil" cx={spot.x} cy={spot.y} r="7" pointerEvents="none" />
          </g>
        </Face>
      ) : (
        <Face
          size={340}
          eyeColor={eyeColor}
          faceStyle={faceStyle}
          emotion={phase === 'fin' ? (newRecord ? 'feliz' : score >= 10 ? 'sorprendido' : 'curioso') : 'neutral'}
        />
      )}

      <p className="game-score" aria-live="polite">
        {phase === 'listo' && 'Tocá el ojo todas las veces que puedas en 20 segundos.'}
        {phase === 'jugando' && `Ojos atrapados: ${score}`}
        {phase === 'fin' && `${score} ojos${newRecord ? ' — ¡récord nuevo!' : ''} · Récord: ${record}`}
      </p>
      <div className="game-controls">
        {phase !== 'jugando' && (
          <button type="button" onClick={start}>
            {phase === 'fin' ? 'Otra vez' : 'Empezar'}
          </button>
        )}
        <button type="button" className="ghost" onClick={onExit}>
          Salir
        </button>
      </div>
    </>
  );
}
