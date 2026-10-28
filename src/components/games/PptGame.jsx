import { useEffect, useRef, useState } from 'react';
import Face from '../Face.jsx';

const CHOICES = [
  { id: 'piedra', label: 'Piedra' },
  { id: 'papel', label: 'Papel' },
  { id: 'tijera', label: 'Tijera' },
];
const BEATS = { piedra: 'tijera', papel: 'piedra', tijera: 'papel' };

const PHRASES = {
  tierno: {
    gana: ['¡Te gané!', '¡Soy invencible!', 'Je, otra para mí'],
    pierde: ['Uh, me ganaste…', '¡Revancha!', 'Suerte de principiante'],
    empate: ['¡Empate!', 'Pensamos igual', 'Otra vez…'],
  },
  terror: {
    gana: ['Tu alma es mía', 'Lo sabía…', 'Siempre gano'],
    pierde: ['Esto no termina acá', 'Te voy a visitar…', 'Mmm… suerte'],
    empate: ['Interesante…', 'Me leíste la mente', 'Otra… si te animás'],
  },
};

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function Icon({ kind }) {
  if (kind === 'piedra') {
    return (
      <g className="game-icon">
        <path d="M86 96 Q80 62 110 56 Q142 48 154 72 Q166 98 140 108 Q110 116 86 96 Z" />
        <path d="M112 72 L122 82 L118 92" />
      </g>
    );
  }
  if (kind === 'papel') {
    return (
      <g className="game-icon">
        <rect x="96" y="40" width="48" height="66" rx="4" />
        <path d="M106 56 H134 M106 68 H134 M106 80 H126" />
      </g>
    );
  }
  return (
    <g className="game-icon">
      <circle cx="102" cy="98" r="10" />
      <circle cx="138" cy="98" r="10" />
      <path d="M108 90 L146 44 M132 90 L94 44" />
    </g>
  );
}

/** Piedra, papel o tijera (como AIBI). En el robot se va a elegir tocando la pantalla o con la voz. */
export default function PptGame({ eyeColor, faceStyle, onExit }) {
  const [phase, setPhase] = useState('elegir'); // elegir · cuenta · resultado · reaccion
  const [round, setRound] = useState(null);
  const [score, setScore] = useState({ vos: 0, robot: 0 });
  const timers = useRef([]);
  const tone = PHRASES[faceStyle] || PHRASES.tierno;

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (ms, fn) => timers.current.push(setTimeout(fn, ms));

  function play(choice) {
    const robot = pick(CHOICES).id;
    const result = choice === robot ? 'empate' : BEATS[robot] === choice ? 'gana' : 'pierde';
    setRound({ choice, robot, result, phrase: pick(tone[result]) });
    setPhase('cuenta');
    later(1300, () => setPhase('resultado'));
    later(2900, () => {
      setPhase('reaccion');
      setScore((s) => ({
        vos: s.vos + (result === 'pierde' ? 1 : 0),
        robot: s.robot + (result === 'gana' ? 1 : 0),
      }));
    });
    later(4600, () => setPhase('elegir'));
  }

  const reaction = round && { gana: 'feliz', pierde: faceStyle === 'terror' ? 'enojado' : 'triste', empate: 'sorprendido' }[round.result];

  return (
    <>
      {phase === 'cuenta' && (
        <Face size={340} eyeColor={eyeColor} faceStyle={faceStyle}>
          <g className="shake">
            <rect className="eye" x="58" y="62" width="40" height="56" rx="18" />
            <rect className="eye" x="142" y="62" width="40" height="56" rx="18" />
          </g>
          <text className="game-text" x="120" y="152" textAnchor="middle">
            piedra… papel… tijera…
          </text>
        </Face>
      )}
      {phase === 'resultado' && (
        <Face size={340} eyeColor={eyeColor} faceStyle={faceStyle}>
          <Icon kind={round.robot} />
          <text className="game-text" x="120" y="150" textAnchor="middle">
            {round.phrase}
          </text>
        </Face>
      )}
      {(phase === 'elegir' || phase === 'reaccion') && (
        <Face size={340} eyeColor={eyeColor} faceStyle={faceStyle} emotion={phase === 'reaccion' ? reaction : 'neutral'} />
      )}

      <p className="game-score" aria-live="polite">
        Vos {score.vos} · {score.robot} Robot
        {round && phase !== 'cuenta' && ` — elegiste ${round.choice}, él ${round.robot}`}
      </p>
      <div className="game-controls" role="group" aria-label="Tu jugada">
        {CHOICES.map((c) => (
          <button key={c.id} type="button" onClick={() => play(c.id)} disabled={phase !== 'elegir'}>
            {c.label}
          </button>
        ))}
        <button type="button" className="ghost" onClick={onExit}>
          Salir
        </button>
      </div>
    </>
  );
}
