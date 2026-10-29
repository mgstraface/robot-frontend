// Huesito de cuerpo entero (vista de frente), para ver en el panel cómo se mueven los 4 servos:
// cuello (giro y cabeceo) y los dos hombros. Las mismas posturas y gestos que va a hacer el robot.

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

export default function Body({ pose, gesture, emotion, eyeColor }) {
  const [l, r] = ARM_REST[emotion] || [0, 0];
  const g = gesture ? `b-${gesture}` : '';
  return (
    <svg className={`body ${g}`} viewBox="0 0 140 190" role="img" aria-label="Cuerpo del robot" style={{ '--eye': eyeColor }}>
      {/* tumba */}
      <rect x="18" y="150" width="104" height="36" rx="6" className="body-base" />
      {/* torso con costillas */}
      <path d="M48 150 q-6 -34 8 -56 h28 q14 22 8 56 z" className="body-bone" />
      <path d="M56 112 q14 6 28 0 M54 124 q16 6 32 0 M70 98 v48" className="body-rib" />
      {/* brazos: giran sobre el hombro */}
      <g className="arm arm-l" style={{ '--a': `${l}deg` }}>
        <path d="M50 100 l-14 30 l4 16" className="body-arm" />
      </g>
      <g className="arm arm-r" style={{ '--a': `${-r}deg` }}>
        <path d="M90 100 l14 30 l-4 16" className="body-arm" />
      </g>
      {/* cabeza: giro (pan) y cabeceo (tilt) */}
      <g className="body-head" style={{ '--pan': `${(pose?.pan || 0) * 0.25}px`, '--tilt': `${-(pose?.tilt || 0)}deg` }}>
        <path d="M44 56 a26 28 0 0 1 52 0 q0 14 -8 20 v8 h-36 v-8 q-8 -6 -8 -20 z" className="body-bone" />
        <rect x="52" y="50" width="36" height="20" rx="4" className="body-screen" />
        <circle cx="62" cy="60" r="3.2" className="body-eye" />
        <circle cx="78" cy="60" r="3.2" className="body-eye" />
      </g>
    </svg>
  );
}
