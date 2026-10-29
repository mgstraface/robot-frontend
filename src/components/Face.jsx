import { useEffect, useId, useRef, useState } from 'react';

// Cara del robot dibujada en SVG. Sirve de simulador en el panel y de referencia
// para dibujar las mismas expresiones en la pantalla del ESP32. La pantalla real es de 320×172 (apaisada):
// el dibujo se hace en coordenadas 240×180 centradas, y la pantalla visible va de x=-40 a 280 y de y=4 a 176.

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

// Boca con dientes y dos colmillos (estilo terror)
function Fangs() {
  const teeth = [];
  for (let x = 82; x <= 152; x += 10) {
    if (x === 92 || x === 142) continue; // ahí van los colmillos
    teeth.push(<path key={x} className="tooth" d={`M${x} 134 L${x + 5} 141 L${x + 10} 134 Z`} />);
  }
  return (
    <g>
      <path className="maw" d="M72 132 L168 132 Q160 166 120 168 Q80 166 72 132 Z" />
      {teeth}
      <path className="tooth" d="M90 133 L97 152 L104 133 Z" />
      <path className="tooth" d="M136 133 L143 152 L150 133 Z" />
      <path className="tooth" d="M96 166 L101 158 L106 166 Z" />
      <path className="tooth" d="M114 168 L119 159 L124 168 Z" />
      <path className="tooth" d="M132 166 L137 158 L142 166 Z" />
    </g>
  );
}

// Bocas (debajo de los ojos). Si está hablando, cualquier boca pasa a ser la que se mueve.
const MOUTHS = {
  sonrisa: <path className="mouth-line" d="M100 140 Q120 158 140 140" />,
  sonrisita: <path className="mouth-line" d="M108 142 Q120 151 132 142" />,
  triste: <path className="mouth-line" d="M102 152 Q120 138 138 152" />,
  o: <ellipse className="mouth" cx="120" cy="147" rx="8" ry="10" />,
  grr: <path className="mouth-line thin" d="M96 150 l8 -7 l8 7 l8 -7 l8 7 l8 -7 l8 7" />,
  picara: <path className="mouth-line" d="M106 146 Q126 152 142 138" />,
  recta: <path className="mouth-line" d="M106 147 L134 147" />,
  ondulada: <path className="mouth-line thin" d="M96 148 q6 -6 12 0 t12 0 t12 0 t12 0" />,
  carcajada: <path className="mouth" d="M92 136 L148 136 Q146 164 120 164 Q94 164 92 136 Z" />,
  lengua: (
    <g>
      <path className="mouth-line" d="M100 138 Q120 154 140 138" />
      <path className="tongue" d="M112 146 L128 146 L128 156 Q120 166 112 156 Z" />
    </g>
  ),
};

/** Estrella de 5 puntas centrada en (cx, cy). */
function star(cx, cy, r1, r2) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? r2 : r1;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join('L')}Z`;
}

function Mouth({ kind, talking }) {
  if (talking) return <ellipse className="mouth talk" cx="120" cy="146" rx="12" ry="9" />;
  return kind ? MOUTHS[kind] : null;
}

// Ojo en espiral (mareado): espiral de Arquímedes de dos vueltas y media
function spiralPath(cx, cy) {
  const pts = [];
  for (let i = 0; i <= 90; i++) {
    const t = (i / 90) * Math.PI * 5;
    const r = 1.5 + (t / (Math.PI * 5)) * 17;
    pts.push(`${(cx + r * Math.cos(t)).toFixed(1)} ${(cy + r * Math.sin(t)).toFixed(1)}`);
  }
  return `M${pts.join(' L')}`;
}

function Spiral({ cx }) {
  return <path className="eye-line spiral" style={{ transformOrigin: `${cx}px ${Y}px` }} d={spiralPath(cx, Y)} />;
}

// Íconos del clima (estilo AIBI): arriba de los ojos, que miran hacia el ícono
function WeatherIcon({ kind }) {
  const cloud = (cls = 'cloud') => (
    <g className={cls}>
      <ellipse cx="108" cy="44" rx="20" ry="13" />
      <ellipse cx="130" cy="38" rx="18" ry="16" />
      <ellipse cx="146" cy="47" rx="14" ry="10" />
      <rect x="92" y="44" width="66" height="13" rx="6" />
    </g>
  );
  if (kind === 'despejado' || kind === 'parcial') {
    return (
      <g>
        <g className="sun">
          <circle cx="120" cy="40" r="13" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <rect key={a} x="118" y="15" width="4" height="9" rx="2" transform={`rotate(${a} 120 40)`} />
          ))}
        </g>
        {kind === 'parcial' && <g transform="translate(14 6) scale(0.8)">{cloud()}</g>}
      </g>
    );
  }
  if (kind === 'niebla') {
    return (
      <g className="fog">
        <rect x="86" y="28" width="68" height="5" rx="2.5" />
        <rect x="96" y="40" width="62" height="5" rx="2.5" />
        <rect x="84" y="52" width="56" height="5" rx="2.5" />
      </g>
    );
  }
  const drops = kind === 'nieve' ? 'flake' : 'drop';
  return (
    <g>
      {cloud()}
      {(kind === 'lluvia' || kind === 'tormenta' || kind === 'nieve') &&
        [100, 116, 132, 148].map((x, i) =>
          drops === 'flake' ? (
            <circle key={x} className="flake" cx={x} cy="64" r="2.5" style={{ animationDelay: `${i * 0.25}s` }} />
          ) : (
            <rect key={x} className="drop" x={x} y="62" width="3" height="9" rx="1.5" style={{ animationDelay: `${i * 0.2}s` }} />
          )
        )}
      {kind === 'tormenta' && <path className="bolt" d="M126 56 L116 72 L124 72 L118 86 L134 66 L126 66 L132 56 Z" />}
    </g>
  );
}

const FACES = {
  neutral: (style, talking) =>
    style === 'terror' ? (
      <g>
        <TerrorEyes />
        <Mouth talking={talking} />
      </g>
    ) : (
      <g>
        <g className="blink">
          <Eye cx={L} />
          <Eye cx={R} />
        </g>
        <Mouth talking={talking} />
      </g>
    ),
  escuchando: () => (
    <g className="blink pulse">
      <Eye cx={L} w={44} h={60} />
      <Eye cx={R} w={44} h={60} />
    </g>
  ),
  feliz: (style, talking) => (
    <g>
      <path className="eye-line" d={`M ${L - 22} ${Y + 8} Q ${L} ${Y - 26} ${L + 22} ${Y + 8}`} />
      <path className="eye-line" d={`M ${R - 22} ${Y + 8} Q ${R} ${Y - 26} ${R + 22} ${Y + 8}`} />
      <ellipse className="cheek" cx={L - 18} cy={Y + 30} rx="12" ry="6" />
      <ellipse className="cheek" cx={R + 18} cy={Y + 30} rx="12" ry="6" />
      <Mouth kind="sonrisa" talking={talking} />
    </g>
  ),
  triste: (style, talking) => (
    <g>
      <g className="blink">
        <Eye cx={L} dy={6} h={48} />
        <Eye cx={R} dy={6} h={48} />
      </g>
      <Lid cx={L} side="L" inner={8} outer={28} />
      <Lid cx={R} side="R" inner={8} outer={28} />
      <Mouth kind="triste" talking={talking} />
    </g>
  ),
  enojado: (style, talking) => (
    <g>
      <g className="blink">
        <Eye cx={L} />
        <Eye cx={R} />
      </g>
      <Lid cx={L} side="L" inner={30} outer={8} />
      <Lid cx={R} side="R" inner={30} outer={8} />
      <Mouth kind="grr" talking={talking} />
    </g>
  ),
  sorprendido: (style, talking) => (
    <g>
      <g className="blink">
        <circle className="eye" cx={L} cy={Y} r="28" />
        <circle className="eye" cx={R} cy={Y} r="28" />
        <circle className="pupil" cx={L} cy={Y} r="9" />
        <circle className="pupil" cx={R} cy={Y} r="9" />
      </g>
      <Mouth kind="o" talking={talking} />
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
  mareado: () => (
    <g className="woozy">
      <Spiral cx={L} />
      <Spiral cx={R} />
      <path className="eye-line" d="M100 140 q5 -6 10 0 t10 0 t10 0 t10 0" />
    </g>
  ),
  amor: (style, talking) => (
    <g>
      <g className="beat">
        <Heart cx={L} />
        <Heart cx={R} />
      </g>
      <Mouth kind="sonrisita" talking={talking} />
    </g>
  ),
  curioso: (style, talking) => (
    <g>
      <g className="blink">
        <Eye cx={L} w={34} h={42} dy={6} />
        <Eye cx={R} w={46} h={64} dy={-2} />
      </g>
      <Mouth kind="picara" talking={talking} />
    </g>
  ),
  // ---- caras nuevas
  asustado: (style, talking) => (
    <g className="tremble">
      <circle className="eye" cx={L} cy={Y - 4} r="26" />
      <circle className="eye" cx={R} cy={Y - 4} r="26" />
      <circle className="pupil" cx={L} cy={Y - 4} r="5" />
      <circle className="pupil" cx={R} cy={Y - 4} r="5" />
      <Mouth kind="ondulada" talking={talking} />
    </g>
  ),
  picaro: (style, talking) => (
    <g>
      <path className="eye-line" d={`M ${L - 20} ${Y + 2} Q ${L} ${Y - 12} ${L + 20} ${Y + 2}`} />
      <g className="blink">
        <Eye cx={R} />
      </g>
      <Mouth kind="picara" talking={talking} />
    </g>
  ),
  aburrido: (style, talking) => (
    <g>
      <Eye cx={L} dy={4} />
      <Eye cx={R} dy={4} />
      <polygon className="lid" points={`${L - 40},0 ${R + 40},0 ${R + 40},${Y} ${L - 40},${Y}`} />
      <Mouth kind="recta" talking={talking} />
    </g>
  ),
  riendo: (style, talking) => (
    <g className="bounce">
      <path className="eye-line" d={`M ${L - 18} ${Y - 12} L ${L + 10} ${Y} L ${L - 18} ${Y + 12}`} />
      <path className="eye-line" d={`M ${R + 18} ${Y - 12} L ${R - 10} ${Y} L ${R + 18} ${Y + 12}`} />
      <Mouth kind="carcajada" talking={talking} />
    </g>
  ),
  llorando: (style, talking) => (
    <g>
      <path className="eye-line" d={`M ${L - 20} ${Y} Q ${L} ${Y - 14} ${L + 20} ${Y}`} />
      <path className="eye-line" d={`M ${R - 20} ${Y} Q ${R} ${Y - 14} ${R + 20} ${Y}`} />
      <path className="tear-stream" d={`M ${L - 6} ${Y + 6} q -4 30 2 70`} />
      <path className="tear-stream tear-2" d={`M ${R + 6} ${Y + 6} q 4 30 -2 70`} />
      <Mouth kind="ondulada" talking={talking} />
    </g>
  ),
  confundido: (style, talking) => (
    <g>
      <g className="blink">
        <Eye cx={L} w={30} h={30} dy={6} />
        <Eye cx={R} w={42} h={58} dy={-4} />
      </g>
      <path className="eye-line thin-line" d={`M ${R - 18} ${Y - 46} L ${R + 20} ${Y - 38}`} />
      <text className="qmark" x={R + 46} y={Y - 26}>?</text>
      <Mouth kind="ondulada" talking={talking} />
    </g>
  ),
  emocionado: (style, talking) => (
    <g>
      <g className="twinkle">
        <path className="eye" d={star(L, Y, 28, 12)} />
        <path className="eye" d={star(R, Y, 28, 12)} />
      </g>
      <Mouth kind="carcajada" talking={talking} />
    </g>
  ),
  avergonzado: (style, talking) => (
    <g>
      <g className="blink">
        <Eye cx={L} w={34} h={30} dy={14} dx={-4} />
        <Eye cx={R} w={34} h={30} dy={14} dx={-4} />
      </g>
      <ellipse className="cheek blush" cx={L - 6} cy={Y + 38} rx="18" ry="8" />
      <ellipse className="cheek blush" cx={R + 6} cy={Y + 38} rx="18" ry="8" />
      <Mouth kind="sonrisita" talking={talking} />
    </g>
  ),
  nervioso: (style, talking) => (
    <g className="tremble">
      <g className="blink">
        <Eye cx={L} w={36} h={46} />
        <Eye cx={R} w={36} h={46} />
      </g>
      <path className="sweat" d={`M ${R + 46} ${Y - 40} q 8 14 0 20 q -8 -6 0 -20 z`} />
      <Mouth kind="grr" talking={talking} />
    </g>
  ),
  muerto: (style, talking) => (
    <g>
      <path className="eye-line" d={`M ${L - 16} ${Y - 16} L ${L + 16} ${Y + 16} M ${L + 16} ${Y - 16} L ${L - 16} ${Y + 16}`} />
      <path className="eye-line" d={`M ${R - 16} ${Y - 16} L ${R + 16} ${Y + 16} M ${R + 16} ${Y - 16} L ${R - 16} ${Y + 16}`} />
      {talking ? <Mouth talking /> : <path className="tongue" d="M128 140 L142 140 L142 154 Q135 164 128 154 Z" />}
      {!talking && <path className="mouth-line" d="M104 142 L146 140" />}
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
  mareado: 'Mareado',
  asustado: 'Asustado',
  picaro: 'Pícaro',
  aburrido: 'Aburrido',
  riendo: 'Riendo',
  llorando: 'Llorando',
  confundido: 'Confundido',
  emocionado: 'Emocionado',
  avergonzado: 'Avergonzado',
  nervioso: 'Nervioso',
  muerto: 'Muerto',
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
    modes: ['tierno'],
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
  // Detalles tipo Eilik (modo tierno)
  estornudo: {
    ms: 2600,
    modes: ['tierno'],
    render: () => (
      <g className="sneeze">
        <g className="sneeze-squint">
          <path className="eye-line" d={`M${L - 18} ${Y - 6} L${L + 6} ${Y} L${L - 18} ${Y + 6}`} />
          <path className="eye-line" d={`M${R + 18} ${Y - 6} L${R - 6} ${Y} L${R + 18} ${Y + 6}`} />
        </g>
        <text className="sneeze-text" x="120" y="150" textAnchor="middle">
          ¡achís!
        </text>
      </g>
    ),
  },
  hipo: {
    ms: 3000,
    modes: ['tierno'],
    render: () => (
      <g>
        <g className="hiccup blink">
          <Eye cx={L} />
          <Eye cx={R} />
        </g>
        <text className="hic-text" x="196" y="52">
          hip
        </text>
      </g>
    ),
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
  colmillos: {
    ms: 4200,
    modes: ['terror'],
    render: () => (
      <g>
        <TerrorEyes />
        <g className="mouth-open">
          <Fangs />
        </g>
      </g>
    ),
  },
  lengua: {
    ms: 2600,
    modes: ['tierno'],
    render: () => (
      <g>
        <path className="eye-line" d={`M ${L - 20} ${Y + 6} Q ${L} ${Y - 20} ${L + 20} ${Y + 6}`} />
        <g className="blink">
          <Eye cx={R} w={36} h={48} />
        </g>
        <Mouth kind="lengua" />
      </g>
    ),
  },
  silbar: {
    ms: 3800,
    modes: ['tierno'],
    render: () => (
      <g>
        <g className="look-up">
          <Eye cx={L} w={36} h={44} dx={-8} dy={-8} />
          <Eye cx={R} w={36} h={44} dx={-8} dy={-8} />
        </g>
        <ellipse className="mouth" cx="132" cy="146" rx="6" ry="7" />
        <text className="note" x={150} y={140}>♪</text>
        <text className="note note-2" x={166} y={124}>♫</text>
      </g>
    ),
  },
  sonrisaMacabra: {
    ms: 4000,
    modes: ['terror'],
    render: () => (
      <g>
        <TerrorEyes />
        <g className="grin">
          <path className="mouth-line thin" d="M60 128 Q120 168 180 128" />
          {[78, 96, 114, 132, 150, 166].map((x, i) => (
            <path key={x} className="mouth-line stitch" d={`M${x} ${136 + [2, 9, 12, 12, 9, 2][i] - 7} l0 14`} />
          ))}
        </g>
      </g>
    ),
  },
  mordisco: {
    ms: 3000,
    modes: ['terror'],
    render: () => (
      <g>
        <TerrorEyes className="" />
        <g className="chomp">
          <Fangs />
        </g>
      </g>
    ),
  },
  risa: {
    ms: 3600,
    modes: ['terror'],
    // lo que dice en voz alta (si "Voz en la PC" está activada)
    sound: 'jejeje... jajajaja',
    render: () => (
      <g className="laugh">
        <g>
          <g className="blink-odd">
            <Eye cx={L} />
            <Eye cx={R} />
          </g>
          <Lid cx={L} side="L" inner={30} outer={18} />
          <Lid cx={R} side="R" inner={30} outer={18} />
        </g>
        <g className="mouth-open">
          <Fangs />
        </g>
      </g>
    ),
  },
  tercerOjo: {
    ms: 3800,
    modes: ['terror'],
    render: () => (
      <g>
        <TerrorEyes />
        <g className="third-eye">
          <ellipse className="eye" cx="120" cy="30" rx="16" ry="11" />
          <ellipse className="pupil" cx="120" cy="30" rx="3" ry="9" />
        </g>
      </g>
    ),
  },
  lagrima: {
    ms: 4000,
    modes: ['terror'],
    render: () => (
      <g>
        <TerrorEyes />
        <path className="blood-drop" d="M74 118 Q74 112 78 106 Q82 112 82 118 A4 4 0 0 1 74 118 Z" />
        <path className="blood-drop drop-2" d="M74 118 Q74 112 78 106 Q82 112 82 118 A4 4 0 0 1 74 118 Z" />
      </g>
    ),
  },
  apagon: {
    ms: 3200,
    modes: ['terror'],
    render: () => (
      <g className="blackout">
        <TerrorEyes className="" />
      </g>
    ),
  },
  // Newell's: festejo de gol y bandera rojinegra (las dispara el seguimiento de partidos o el panel)
  gol: {
    ms: 5000,
    manual: true,
    render: () => (
      <g>
        <clipPath id="gol-clip">
          <rect x="-40" y="4" width="320" height="172" rx="30" />
        </clipPath>
        <g className="stripes" clipPath="url(#gol-clip)">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <rect key={i} x={i * 40 - 40} y="0" width="20" height="180" className="stripe-red" />
          ))}
        </g>
        <g className="bounce">
          <path className="eye-line" d={`M ${L - 18} ${Y - 30} L ${L + 10} ${Y - 18} L ${L - 18} ${Y - 6}`} />
          <path className="eye-line" d={`M ${R + 18} ${Y - 30} L ${R - 10} ${Y - 18} L ${R + 18} ${Y - 6}`} />
          <text className="gol-text" x="120" y="150" textAnchor="middle">GOOOL</text>
        </g>
      </g>
    ),
  },
  bandera: {
    ms: 4500,
    manual: true,
    render: () => (
      <g>
        <g className="flag">
          <rect x="40" y="40" width="80" height="100" className="flag-red" />
          <rect x="120" y="40" width="80" height="100" className="flag-black" />
        </g>
        <path className="mouth-line" d="M100 158 Q120 170 140 158" />
      </g>
    ),
  },
  // Clima animado (lo dispara el saludo o el panel; no es parte de la vida propia al azar)
  clima: {
    ms: 5200,
    manual: true,
    render: (style, kind = 'despejado') => (
      <g>
        <g transform="translate(0 22)">
          {style === 'terror' ? (
            <TerrorEyes />
          ) : (
            <g className="blink">
              <Eye cx={L} w={36} h={42} dy={0} />
              <Eye cx={R} w={36} h={42} dy={0} />
            </g>
          )}
        </g>
        {/* el ícono va arriba de todo, para que los párpados del estilo terror no lo tapen */}
        <WeatherIcon kind={kind} />
      </g>
    ),
  },
  dormir: { ms: Infinity, render: () => FACES.dormido() },
};

/** Acciones de vida propia disponibles para un estilo de cara. */
export function idleActionsFor(style) {
  return Object.keys(IDLE_ACTIONS).filter(
    (a) => a !== 'dormir' && !IDLE_ACTIONS[a].manual && (!IDLE_ACTIONS[a].modes || IDLE_ACTIONS[a].modes.includes(style))
  );
}

const FADE_MS = 380;

/** Duración de una acción ("clima:lluvia" → la de "clima"). */
export function actionMs(action) {
  return IDLE_ACTIONS[String(action).split(':')[0]]?.ms ?? 3000;
}

function renderLayer({ emotion, action, faceStyle, photo, clipId, talking }) {
  if (photo) {
    return (
      <image href={photo} x="-40" y="4" width="320" height="172" preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clipId})`} />
    );
  }
  const [name, param] = action ? String(action).split(':') : [];
  const idle = name && IDLE_ACTIONS[name];
  if (idle) return idle.render(faceStyle, param);
  return (FACES[emotion] || FACES.neutral)(faceStyle, talking);
}

/**
 * Cara con fundido cruzado: cuando cambia la emoción, la acción o el estilo, la cara anterior
 * se desvanece mientras aparece la nueva (en vez de cambiar de golpe).
 */
export default function Face({ emotion = 'neutral', action = null, size = 320, onPet, eyeColor, faceStyle = 'tierno', photo = null, talking = false, children }) {
  const clipId = `face-clip-${useId().replace(/:/g, '')}`;
  const key = photo ? `photo-${photo}` : `${faceStyle}-${action ? `idle-${action}` : emotion}`;
  const [layers, setLayers] = useState(() => [{ key, emotion, action, faceStyle, photo, leaving: false }]);
  const timers = useRef([]);

  useEffect(() => {
    setLayers((prev) => {
      const current = prev[prev.length - 1];
      if (current && current.key === key) return prev;
      // la capa actual pasa a "saliendo"; las que ya salían se descartan
      return [...(current ? [{ ...current, leaving: true }] : []), { key, emotion, action, faceStyle, photo, leaving: false }];
    });
    const t = setTimeout(() => setLayers((prev) => prev.filter((l) => !l.leaving)), FADE_MS);
    timers.current.push(t);
  }, [key, emotion, action, faceStyle, photo]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  return (
    <div className={`face-shell ${onPet ? 'pettable' : ''}`} style={{ width: size }} onClick={onPet} title={onPet ? 'Haceme un mimo' : undefined}>
      <svg
        className={`face ${faceStyle === 'terror' ? 'terror' : ''}`}
        style={eyeColor ? { '--eye': eyeColor } : undefined}
        viewBox="-40 4 320 172"
        role="img"
        aria-label={`Cara: ${EMOTION_LABELS[emotion] || emotion}`}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x="-40" y="4" width="320" height="172" rx="30" />
          </clipPath>
        </defs>
        <rect className="screen" x="-40" y="4" width="320" height="172" rx="30" />
        {children
          ? children /* un juego dibuja su propia pantalla */
          : layers.map((l) => (
              <g key={l.key} className={l.leaving ? 'face-leave' : 'face-enter'}>
                {renderLayer({ ...l, clipId, talking: talking && !l.leaving })}
              </g>
            ))}
      </svg>
    </div>
  );
}
