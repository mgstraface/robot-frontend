// Robi de cuerpo entero (vista de frente, diseño v3), para ver en el panel cómo se mueven los 4 servos:
// cuello (giro y cabeceo) y los dos hombros. Las mismas posturas y gestos que va a hacer el robot.
// Proporciones del modelo real: cuerpo "poroto" de 66 × 94 mm, collar, cabeza-pantalla y brazos curvos (14,4 cm en total).

// Ángulo de reposo de cada brazo según la emoción (0 = colgando, positivo = hacia arriba/afuera)
const ARM_REST = {
  feliz: [25, 25],
  triste: [-8, -8],
  sorprendido: [60, 60],
  enojado: [10, 10],
  amor: [35, 35],
  asustado: [120, 120],
  riendo: [40, 40],
  emocionado: [70, 70],
  avergonzado: [-5, 20],
  nervioso: [15, 15],
  muerto: [-12, 75],
  pensando: [0, 95],
};

export default function Body({ pose, gesture, emotion, eyeColor, onZone }) {
  const [l, r] = ARM_REST[emotion] || [0, 0];
  const g = gesture ? `b-${gesture}` : '';
  return (
    <svg className={`body ${g}`} viewBox="0 0 140 190" role="img" aria-label="Cuerpo del robot" style={{ '--eye': eyeColor }}>
      <defs>
        <linearGradient id="body-shade" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#a9a9b0" />
          <stop offset="1" stopColor="#8a8a92" />
        </linearGradient>
      </defs>
      {/* sombra en el piso */}
      <ellipse cx="70" cy="180" rx="46" ry="4.5" className="body-base" />
      {/* brazos curvos: giran sobre el hombro (el servo está a los costados, adelante) */}
      <g className="arm arm-l" style={{ '--a': `${l}deg` }}>
        <path d="M33 118 q-9 2 -10 20 q-1 10 5 17" className="body-arm-out" />
        <path d="M33 118 q-9 2 -10 20 q-1 10 5 17" className="body-arm" />
      </g>
      <g className="arm arm-r" style={{ '--a': `${-r}deg` }}>
        <path d="M107 118 q9 2 10 20 q1 10 -5 17" className="body-arm-out" />
        <path d="M107 118 q9 2 10 20 q1 10 -5 17" className="body-arm" />
      </g>
      {/* cuerpo poroto */}
      <path d="M58 69 H82 Q104 69 105 92 L108 156 Q108 177 88 177 H52 Q32 177 32 156 L35 92 Q36 69 58 69 Z" className="body-shell" />
      {/* parlante al frente, con la boquita abajo */}
      <rect x="62" y="162" width="16" height="3.2" rx="1.6" className="body-mouth" />
      {/* collar (servo del NO) */}
      <rect x="62" y="59" width="16" height="12" rx="3" className="body-collar" />
      {/* cabeza: giro (pan) y cabeceo (tilt) */}
      <g className="body-head" style={{ '--pan': `${(pose?.pan || 0) * 0.25}px`, '--tilt': `${-(pose?.tilt || 0)}deg` }}>
        <rect x="41" y="23" width="58" height="37" rx="9" className="body-bezel" />
        <rect x="46" y="28" width="48" height="27" rx="5" className="body-screen" />
        <rect x="56" y="35" width="8" height="12" rx="4" className="body-eye" />
        <rect x="76" y="35" width="8" height="12" rx="4" className="body-eye" />
      </g>
      {/* zonas táctiles (los mismos sensores que el robot): cabeza y panza */}
      {onZone && (
        <>
          <ellipse cx="70" cy="41" rx="31" ry="21" className="body-zone" onClick={() => onZone('cabeza')}>
            <title>Sensor de la cabeza</title>
          </ellipse>
          <ellipse cx="70" cy="122" rx="26" ry="30" className="body-zone" onClick={() => onZone('panza')}>
            <title>Sensor de la panza</title>
          </ellipse>
        </>
      )}
    </svg>
  );
}
