// Cara del robot dibujada en SVG. Sirve de simulador en el panel y de referencia
// para dibujar las mismas expresiones en la pantalla del ESP32 (240×180 aprox.).

const L = 78; // centro ojo izquierdo
const R = 162; // centro ojo derecho
const Y = 90; // altura de los ojos

function Eye({ cx, w = 40, h = 56, dy = 0, dx = 0 }) {
  return <rect x={cx - w / 2 + dx} y={Y - h / 2 + dy} width={w} height={h} rx={Math.min(18, w / 2)} className="eye" />;
}

function Heart({ cx }) {
  const s = 1.15;
  return (
    <path
      className="eye"
      transform={`translate(${cx} ${Y}) scale(${s}) translate(-20 -18)`}
      d="M20 34 C 4 22, 0 14, 0 9 C 0 3, 5 0, 10 0 C 14 0, 18 2, 20 6 C 22 2, 26 0, 30 0 C 35 0, 40 3, 40 9 C 40 14, 36 22, 20 34 Z"
    />
  );
}

// Párpado: un polígono del color de la pantalla que tapa parte del ojo.
function Lid({ cx, inner, outer, side }) {
  // inner/outer: cuánto baja el párpado (px) del lado de la nariz y del lado de afuera
  const left = cx - 26;
  const right = cx + 26;
  const top = Y - 34;
  const [yl, yr] = side === 'L' ? [outer, inner] : [inner, outer];
  return <polygon className="lid" points={`${left},${top - 4} ${right},${top - 4} ${right},${top + yr} ${left},${top + yl}`} />;
}

const FACES = {
  neutral: () => (
    <g className="blink">
      <Eye cx={L} />
      <Eye cx={R} />
    </g>
  ),
  escuchando: () => (
    <g className="blink pulse">
      <Eye cx={L} w={44} h={60} />
      <Eye cx={R} w={44} h={60} />
    </g>
  ),
  feliz: () => (
    <g>
      <path className="eye-line" d={`M ${L - 22} ${Y + 8} Q ${L} ${Y - 26} ${L + 22} ${Y + 8}`} />
      <path className="eye-line" d={`M ${R - 22} ${Y + 8} Q ${R} ${Y - 26} ${R + 22} ${Y + 8}`} />
      <ellipse className="cheek" cx={L - 18} cy={Y + 30} rx="12" ry="6" />
      <ellipse className="cheek" cx={R + 18} cy={Y + 30} rx="12" ry="6" />
    </g>
  ),
  triste: () => (
    <g className="blink">
      <Eye cx={L} dy={6} h={48} />
      <Eye cx={R} dy={6} h={48} />
      <Lid cx={L} side="L" inner={8} outer={28} />
      <Lid cx={R} side="R" inner={8} outer={28} />
    </g>
  ),
  enojado: () => (
    <g className="blink">
      <Eye cx={L} />
      <Eye cx={R} />
      <Lid cx={L} side="L" inner={30} outer={8} />
      <Lid cx={R} side="R" inner={30} outer={8} />
    </g>
  ),
  sorprendido: () => (
    <g className="blink">
      <circle className="eye" cx={L} cy={Y} r="30" />
      <circle className="eye" cx={R} cy={Y} r="30" />
      <circle className="pupil" cx={L} cy={Y} r="9" />
      <circle className="pupil" cx={R} cy={Y} r="9" />
    </g>
  ),
  pensando: () => (
    <g>
      <g className="look-up">
        <Eye cx={L} w={36} h={44} dx={8} dy={-10} />
        <Eye cx={R} w={36} h={44} dx={8} dy={-10} />
      </g>
      <g className="dots">
        <circle cx={R - 10} cy={Y + 52} r="4" />
        <circle cx={R + 4} cy={Y + 52} r="4" />
        <circle cx={R + 18} cy={Y + 52} r="4" />
      </g>
    </g>
  ),
  dormido: () => (
    <g>
      <path className="eye-line" d={`M ${L - 20} ${Y + 4} Q ${L} ${Y + 16} ${L + 20} ${Y + 4}`} />
      <path className="eye-line" d={`M ${R - 20} ${Y + 4} Q ${R} ${Y + 16} ${R + 20} ${Y + 4}`} />
      <text className="zzz" x={R + 34} y={Y - 24}>z</text>
      <text className="zzz zzz-2" x={R + 46} y={Y - 42}>z</text>
    </g>
  ),
  amor: () => (
    <g className="beat">
      <Heart cx={L} />
      <Heart cx={R} />
    </g>
  ),
  curioso: () => (
    <g className="blink">
      <Eye cx={L} w={34} h={42} dy={6} />
      <Eye cx={R} w={46} h={64} dy={-2} />
    </g>
  ),
};

export const EMOTION_LABELS = {
  neutral: 'Neutral',
  feliz: 'Feliz',
  triste: 'Triste',
  sorprendido: 'Sorprendido',
  enojado: 'Enojado',
  pensando: 'Pensando',
  dormido: 'Dormido',
  amor: 'Amor',
  curioso: 'Curioso',
  escuchando: 'Escuchando',
};

export default function Face({ emotion = 'neutral', size = 320 }) {
  const render = FACES[emotion] || FACES.neutral;
  return (
    <div className="face-shell" style={{ width: size }}>
      <svg className="face" viewBox="0 0 240 180" role="img" aria-label={`Cara: ${EMOTION_LABELS[emotion] || emotion}`}>
        <rect className="screen" x="0" y="0" width="240" height="180" rx="36" />
        <g key={emotion} className="face-enter">
          {render()}
        </g>
      </svg>
    </div>
  );
}
