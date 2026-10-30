// Menú en la pantalla del robot: carrusel con una opción por pantalla (se dibuja dentro de <Face>).
// Coordenadas del panel: la pantalla visible va de x=-40 a 280 y de y=4 a 176.

export const MENU = {
  main: [
    { id: 'juegos', label: 'Juegos' },
    { id: 'cocina', label: 'Cocina' },
    { id: 'temporizador', label: 'Temporizador' },
    { id: 'timer', label: 'Pomodoro 25 min' },
    { id: 'clima', label: 'Clima' },
    { id: 'fotos', label: 'Fotos' },
    { id: 'modo', label: 'Tierno / Terror' },
    { id: 'ajustes', label: 'Brillo y volumen' },
  ],
  temporizador: [
    { id: 't1', label: '1 minuto', min: 1 },
    { id: 't3', label: '3 minutos', min: 3 },
    { id: 't5', label: '5 minutos', min: 5 },
    { id: 't10', label: '10 minutos', min: 10 },
    { id: 't15', label: '15 minutos', min: 15 },
    { id: 't30', label: '30 minutos', min: 30 },
    { id: 'cronometro', label: 'Cronómetro' },
    { id: 'volver', label: 'Volver' },
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
    case 'cocina':
    case 'receta':
      return (
        <g>
          <path d="M92 66 h56 v18 a14 14 0 0 1 -14 14 h-28 a14 14 0 0 1 -14 -14 z M86 66 h68" />
          <path d="M108 56 q4 -8 0 -14 M120 56 q4 -8 0 -14 M132 56 q4 -8 0 -14" />
        </g>
      );
    case 'temporizador':
    case 'cronometro':
      return (
        <g>
          <path d="M100 46 h40 M100 98 h40 M104 46 q0 18 16 26 q-16 8 -16 26 M136 46 q0 18 -16 26 q16 8 16 26" />
        </g>
      );
    case 't1':
    case 't3':
    case 't5':
    case 't10':
    case 't15':
    case 't30':
      return (
        <text x="120" y="92" textAnchor="middle" className="menu-num">
          {id.slice(1)}
        </text>
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

export default function ScreenMenu({ level, index, items: custom }) {
  const items = custom || MENU[level];
  const item = items[index];
  return (
    <g className="screen-menu">
      <text className="menu-crumb" x="-24" y="26">
        {{ juegos: 'Menú › Juegos', temporizador: 'Menú › Temporizador', recetas: 'Menú › Cocina' }[level] || 'Menú'}
      </text>
      <g className="menu-icon">
        <Icon id={item.id} />
      </g>
      {item.label.length > 22 ? (
        wrap(item.label, 34, 2).map((l, i) => (
          <text key={i} className="menu-label small" x="120" y={124 + i * 15} textAnchor="middle">
            {l}
          </text>
        ))
      ) : (
        <text className="menu-label" x="120" y="132" textAnchor="middle">
          {item.label}
        </text>
      )}
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

/** Cronómetro grande (cuenta para adelante). Un toque lo pausa o lo sigue. */
export function Stopwatch({ ms, running }) {
  const total = Math.floor(ms / 100);
  const d = total % 10;
  const s = Math.floor(total / 10) % 60;
  const m = Math.floor(total / 600);
  return (
    <g className="screen-peek">
      <text x="120" y="98" textAnchor="middle" className="stopwatch">
        {`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${d}`}
      </text>
      <text x="120" y="140" textAnchor="middle" className="menu-hint">
        {running ? 'tocá para pausar · deslizá arriba para salir' : 'en pausa · tocá para seguir · deslizá arriba para salir'}
      </text>
    </g>
  );
}

// corta un texto en renglones de ~n caracteres (SVG no hace saltos de línea solo)
function wrap(text, n, max) {
  const words = String(text).split(/\s+/);
  const lines = [''];
  for (const w of words) {
    if ((lines[lines.length - 1] + ' ' + w).trim().length > n) lines.push(w);
    else lines[lines.length - 1] = (lines[lines.length - 1] + ' ' + w).trim();
  }
  if (lines.length > max) {
    lines.length = max;
    lines[max - 1] += '…';
  }
  return lines;
}

/** Pantalla de cocina: el paso actual (o los ingredientes) y la cuenta regresiva más próxima. */
export function CocinaScreen({ cocina, now }) {
  const r = cocina.receta;
  const paso = cocina.paso >= 0 ? r.pasos[cocina.paso] : null;
  const timer = [...cocina.timers].sort((a, b) => a.endsAt - b.endsAt)[0];
  const rest = timer ? Math.max(0, Math.round((timer.endsAt - now) / 1000)) : 0;
  const lines = paso ? wrap(paso.texto, 38, 4) : wrap(`Ingredientes: ${r.ingredientes.join(', ')}`, 40, 5);
  const nombre = r.nombre.length > 34 ? `${r.nombre.slice(0, 33)}…` : r.nombre;
  return (
    <g className="screen-cocina">
      <text className="menu-crumb" x="-24" y="26">
        {paso ? `${nombre} · paso ${cocina.paso + 1}/${r.pasos.length}` : nombre}
      </text>
      {lines.map((l, i) => (
        <text key={i} x="120" y={(timer ? 52 : 60) + i * 18} textAnchor="middle" className="cocina-line">
          {l}
        </text>
      ))}
      {timer && (
        <text x="120" y="150" textAnchor="middle" className="cocina-timer">
          {`${Math.floor(rest / 60)}:${String(rest % 60).padStart(2, '0')}`}
        </text>
      )}
      <text x="120" y="172" textAnchor="middle" className="menu-hint">
        {paso ? 'tocá o cabeza: siguiente · panza: anterior · mantené: terminar' : 'tocá o tocale la cabeza para arrancar · mantené: terminar'}
      </text>
    </g>
  );
}
