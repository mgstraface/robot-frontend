const TYPE_LABELS = {
  connected: 'Se conectó',
  disconnected: 'Se desconectó',
  hello: 'Saludo del firmware',
  touch: 'Toque',
  transcript: 'Escuchó',
  text: 'Texto',
  reply: 'Respondió',
  emotion: 'Cara',
  error: 'Error',
};

function detail(e) {
  if (e.type === 'touch') return `${e.zone} → ${e.emotion}`;
  if (e.type === 'emotion') return e.emotion;
  if (e.type === 'hello') return e.firmware ? `firmware ${e.firmware}` : '';
  return e.text || e.message || '';
}

export default function EventsPanel({ status }) {
  const events = status?.events || [];
  return (
    <div className="events">
      {events.length === 0 && (
        <p className="muted">
          Sin eventos todavía. Cuando el robot se conecte por WebSocket, acá vas a ver toques, lo que escucha y lo que
          responde.
        </p>
      )}
      <ol className="event-list">
        {events.map((e, i) => (
          <li key={`${e.at}-${i}`} className={`event ${e.type}`}>
            <time>{new Date(e.at).toLocaleTimeString('es-AR')}</time>
            <span className="device">{e.deviceId}</span>
            <strong>{TYPE_LABELS[e.type] || e.type}</strong>
            <span className="detail">{detail(e)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
