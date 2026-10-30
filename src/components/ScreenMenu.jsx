// Menú en la pantalla del robot: carrusel con una opción por pantalla (se dibuja dentro de <Face>).
// Coordenadas del panel: la pantalla visible va de x=-40 a 280 y de y=4 a 176.

export const MENU = {
  main: [
    { id: 'juegos', label: 'Juegos' },
    { id: 'timer', label: 'Pomodoro 25 min' },
    { id: 'clima', label: 'Clima' },
    { id: 'fotos', label: 'Fotos' },
    { id: 'modo', label: 'Tierno / Terror' },
    { id: 'ajustes', label: 'Brillo y volumen' },
  ],
  juegos: [
    { id: 'tateti', label: 'Ta-te-ti' },
    { id: 'ppt', label: 'Piedra, papel o tijera' },
    { id: 'ojo', label: 'Atrapá el ojo' },
    { id: 'truco', label: 'Anotador de truco' },
    { id: 'volver', label: 'Volver' },
  ],
};

function Icon({ id }) {
  // íconos de trazo simple, en el color de los ojos
  switch (id) {
    case 'juegos':
      return (
        <g>
          <rect x="88" y="52" width="64" height="40" rx="18" />
          <path d="M104 66 v12 M98 72 h12" />
          <circle cx="132" cy="68" r="3" />
          <circle cx="140" cy="76" r="3" />
        </g>
      );
    case 'timer':
      return (
        <g>
          <circle cx="120" cy="74" r="26" />
          <path d="M120 74 V58 M120 74 L132 82 M112 44 h16" />
        </g>
      );
    case 'clima':
      return (
        <g>
          <circle cx="106" cy="64" r="12" />
          <path d="M108 92 h36 a12 12 0 0 0 0 -24 a16 16 0 0 0 -30 4 a10 10 0 0 0 -6 20 z" />
        </g>
      );
    case 'fotos':
      return (
        <g>
          <rect x="90" y="50" width="60" height="46" rx="6" />
          <path d="M96 90 l16 -18 l12 12 l8 -8 l12 14" />
          <circle cx="134" cy="62" r="4" />
        </g>
      );
    case 'modo':
      return (
        <g>
          <circle cx="120" cy="72" r="26" />
          <path d="M120 46 v52" />
          <circle cx="110" cy="68" r="4" />
          <path d="M126 64 l10 6 M126 70 h10" />
        </g>
      );
    case 'ajustes':
      return (
        <g>
          <circle cx="120" cy="72" r="10" />
          <path d="M120 46 v10 M120 88 v10 M94 72 h10 M136 72 h10 M102 54 l7 7 M131 83 l7 7 M138 54 l-7 7 M109 83 l-7 7" />
        </g>
      );
    case 'tateti':
      return <path d="M108 50 v48 M132 50 v48 M96 62 h48 M96 86 h48" />;
    case 'ppt':
      return (
        <g>
          <circle cx="108" cy="80" r="8" />
          <circle cx="132" cy="80" r="8" />
          <path d="M112 74 L138 48 M128 74 L102 48" />
        </g>
      );
    case 'ojo':
      return (
        <g>
          <path d="M90 72 q30 -30 60 0 q-30 30 -60 0 z" />
          <circle cx="120" cy="72" r="9" />
        </g>
      );
    case 'truco':
      return <path d="M100 56 h20 v20 h-20 z M100 56 l20 20 M128 56 v20 M136 56 v20" />;
    default:
      return <path d="M134 56 l-20 16 l20 16" />;
  }
}

export default function ScreenMenu({ level, index }) {
  const items = MENU[level];
  const item = items[index];
  return (
    <g className="screen-menu">
      <text className="menu-crumb" x="-24" y="26">
        {level === 'juegos' ? 'Menú › Juegos' : 'Menú'}
      </text>
      <g className="menu-icon">
        <Icon id={item.id} />
      </g>
      <text className="menu-label" x="120" y="132" textAnchor="middle">
        {item.label}
      </text>
      <g>
        {items.map((it, i) => (
          <circle key={it.id} cx={120 + (i - (items.length - 1) / 2) * 12} cy="152" r={i === index ? 3.6 : 2.4} className={i === index ? 'dot on' : 'dot'} />
        ))}
      </g>
      <text className="menu-hint" x="120" y="170" textAnchor="middle">
        ‹ deslizá · tocá para entrar · deslizá arriba para salir
      </text>
    </g>
  );
}

/** Vistazo rápido (deslizar hacia abajo): hora, clima y conexión. */
export function Peek({ lines }) {
  return (
    <g className="screen-peek">
      {lines.map((l, i) => (
        <text key={i} x="120" y={i === 0 ? 70 : 70 + i * 28} textAnchor="middle" className={i === 0 ? 'peek-big' : 'peek-line'}>
          {l}
        </text>
      ))}
    </g>
  );
}
