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
  // Ancho y hasta el borde de arriba de la pantalla, así tapa también el brillo del ojo (estilo terror)
  const left = cx - 40;
  const right = cx + 40;
  const top = Y - 34;
  const [yl, yr] = side === 'L' ? [outer, inner] : [inner, outer];
  // la pendiente se extiende a los 80 px de ancho manteniendo la inclinación sobre el ojo
  const slope = (yr - yl) / 52;
  const yLeft = top + yl - slope * 14;
  const yRight = top + yr + slope * 14;
  return <polygon className="lid" points={`${left},0 ${right},0 ${right},${yRight} ${left},${yLeft}`} />;
}

// Ojos en reposo del estilo terror: párpados caídos hacia la nariz y parpadeo de a un ojo.
function TerrorEyes({ className = 'blink-odd' }) {
  return (
    <g>
      <g className={className}>
        <Eye cx={L} />
        <Eye cx={R} />
      </g>
      <Lid cx={L} side="L" inner={20} outer={6} />
      <Lid cx={R} side="R" inner={20} outer={6} />
    </g>
  );
}

const FACES = {
  neutral: (style) =>
    style === 'terror' ? (
      <TerrorEyes />
    ) : (
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

// Acciones de "vida propia": lo que hace solo cuando está en neutral y nadie le da bola.
// Cada una dura IDLE_ACTIONS[x].ms y después vuelve a neutral.
export const IDLE_ACTIONS = {
  mirar: {
    ms: 3200,
    render: (style) => <g className="look-around">{FACES.neutral(style)}</g>,
  },
  pelota: {
    ms: 6400,
    render: () => (
      <g>
        <g className="follow-ball">
          <Eye cx={L} w={38} h={50} />
          <Eye cx={R} w={38} h={50} />
        </g>
        <g className="ball-x">
          <circle className="ball" cx="0" cy="0" r="8" />
        </g>
      </g>
    ),
  },
  pensar: { ms: 4000, render: () => FACES.pensando() },
  bostezo: {
    ms: 3400,
    render: () => (
      <g>
        <g className="yawn-eyes">
          <Eye cx={L} />
          <Eye cx={R} />
        </g>
        <ellipse className="mouth yawn-mouth" cx="120" cy="146" rx="12" ry="10" />
      </g>
    ),
  },
  tararear: {
    ms: 4800,
    modes: ['tierno'],
    render: () => (
      <g>
        <g className="sway">{FACES.feliz()}</g>
        <text className="note" x="196" y="64">♪</text>
        <text className="note note-2" x="210" y="88">♫</text>
      </g>
    ),
  },
  curiosear: {
    ms: 3600,
    render: () => <g className="tilt">{FACES.curioso()}</g>,
  },
  // Solo en estilo terror
  acechar: {
    ms: 4400,
    modes: ['terror'],
    render: () => (
      <g className="stalk">
        <circle className="eye" cx={L} cy={Y} r="8" />
        <circle className="eye" cx={R} cy={Y} r="8" />
      </g>
    ),
  },
  glitch: {
    ms: 1800,
    modes: ['terror'],
    render: () => (
      <g className="glitch">
        <g className="glitch-ghost">
          <TerrorEyes className="" />
        </g>
        <TerrorEyes className="" />
      </g>
    ),
  },
  dormir: { ms: Infinity, render: () => FACES.dormido() },
};

/** Acciones de vida propia disponibles para un estilo de cara. */
export function idleActionsFor(style) {
  return Object.keys(IDLE_ACTIONS).filter((a) => a !== 'dormir' && (!IDLE_ACTIONS[a].modes || IDLE_ACTIONS[a].modes.includes(style)));
}

export default function Face({ emotion = 'neutral', action = null, size = 320, onPet, eyeColor, faceStyle = 'tierno' }) {
  const idle = action && IDLE_ACTIONS[action];
  const render = idle ? idle.render : FACES[emotion] || FACES.neutral;
  const key = `${faceStyle}-${idle ? `idle-${action}` : emotion}`;
  return (
    <div className={`face-shell ${onPet ? 'pettable' : ''}`} style={{ width: size }} onClick={onPet} title={onPet ? 'Haceme un mimo' : undefined}>
      <svg
        className={`face ${faceStyle === 'terror' ? 'terror' : ''}`}
        style={eyeColor ? { '--eye': eyeColor } : undefined}
        viewBox="0 0 240 180"
        role="img"
        aria-label={`Cara: ${EMOTION_LABELS[emotion] || emotion}`}
      >
        <rect className="screen" x="0" y="0" width="240" height="180" rx="36" />
        <g key={key} className="face-enter">
          {render(faceStyle)}
        </g>
      </svg>
    </div>
  );
}
