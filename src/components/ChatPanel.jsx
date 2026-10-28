import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { EMOTION_LABELS } from './Face.jsx';

export default function ChatPanel({ onEmotion, robotId, onError }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [speak, setSpeak] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    api
      .messages('panel', 30)
      .then((list) => setMessages(list.map((m) => ({ role: m.role, text: m.text, emotion: m.emotion }))))
      .catch(onError);
  }, [onError]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  async function send(e) {
    e.preventDefault();
    const value = text.trim();
    if (!value || sending) return;
    setText('');
    setSending(true);
    setMessages((m) => [...m, { role: 'user', text: value }]);
    onEmotion('pensando');
    try {
      const reply = await api.chat(value, speak && robotId ? robotId : undefined);
      setMessages((m) => [...m, { role: 'assistant', text: reply.text, emotion: reply.emotion }]);
      onEmotion(reply.emotion);
    } catch (err) {
      onEmotion('triste');
      onError(err);
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="card chat">
      <header className="card-head">
        <h2>Charlar</h2>
        <label className={`toggle ${robotId ? '' : 'disabled'}`} title={robotId ? '' : 'No hay robot conectado'}>
          <input type="checkbox" checked={speak && !!robotId} disabled={!robotId} onChange={(e) => setSpeak(e.target.checked)} />
          Que lo diga el robot
        </label>
      </header>

      <div className="chat-list" ref={listRef}>
        {messages.length === 0 && <p className="muted">Escribile algo para probar la personalidad.</p>}
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            {m.role === 'assistant' && m.emotion && <span className="tag">{EMOTION_LABELS[m.emotion] || m.emotion}</span>}
            {m.text}
          </div>
        ))}
        {sending && <div className="bubble assistant typing">…</div>}
      </div>

      <form className="chat-input" onSubmit={send}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Decile algo…" disabled={sending} />
        <button type="submit" disabled={!text.trim() || sending}>
          Enviar
        </button>
      </form>
    </section>
  );
}
