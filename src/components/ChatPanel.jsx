import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { listen, speak, stopSpeaking, sttSupported, ttsSupported } from '../speech.js';
import { EMOTION_LABELS } from './Face.jsx';

const VOICE_KEY = 'robot_pc_voice';

function loadVoicePref() {
  try {
    return localStorage.getItem(VOICE_KEY) !== '0';
  } catch {
    return true;
  }
}

export default function ChatPanel({ onEmotion, robotId, serverVoice, onError, prompt }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [speakOnRobot, setSpeakOnRobot] = useState(false);
  const [pcVoice, setPcVoice] = useState(loadVoicePref);
  const [listening, setListening] = useState(false);
  const listenRef = useRef(null);
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

  useEffect(() => stopSpeaking, []);

  // Mensaje que manda otra parte del panel (ej. "Trivia de terror" en Juegos)
  const lastPrompt = useRef(null);
  useEffect(() => {
    if (!prompt || lastPrompt.current === prompt.id) return;
    lastPrompt.current = prompt.id;
    listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    sendText(prompt.text);
  }, [prompt]); // eslint-disable-line react-hooks/exhaustive-deps

  function togglePcVoice(on) {
    setPcVoice(on);
    if (!on) stopSpeaking();
    try {
      localStorage.setItem(VOICE_KEY, on ? '1' : '0');
    } catch {
      /* sin storage */
    }
  }

  async function sendText(value) {
    if (!value || sending) return;
    setSending(true);
    setMessages((m) => [...m, { role: 'user', text: value }]);
    onEmotion('pensando');
    try {
      const reply = await api.chat(value, speakOnRobot && robotId ? robotId : undefined);
      setMessages((m) => [...m, { role: 'assistant', text: reply.text, emotion: reply.emotion }]);
      onEmotion(reply.emotion);
      if (pcVoice && (ttsSupported || serverVoice)) speak(reply.text, { serverVoice });
    } catch (err) {
      onEmotion('triste');
      onError(err);
    } finally {
      setSending(false);
    }
  }

  function submit(e) {
    e.preventDefault();
    const value = text.trim();
    setText('');
    sendText(value);
  }

  async function toggleMic() {
    if (listening) {
      listenRef.current?.stop();
      return;
    }
    stopSpeaking();
    setListening(true);
    onEmotion('escuchando');
    try {
      listenRef.current = listen();
      const heard = await listenRef.current.promise;
      if (heard) {
        await sendText(heard);
      } else {
        onEmotion('curioso');
      }
    } catch (err) {
      onEmotion('triste');
      onError(err);
    } finally {
      listenRef.current = null;
      setListening(false);
    }
  }

  return (
    <section className="card chat">
      <header className="card-head">
        <h2>Charlar</h2>
        <div className="toggles">
          {(ttsSupported || serverVoice) && (
            <label className="toggle">
              <input type="checkbox" checked={pcVoice} onChange={(e) => togglePcVoice(e.target.checked)} />
              Voz en la PC
            </label>
          )}
          <label className={`toggle ${robotId ? '' : 'disabled'}`} title={robotId ? '' : 'No hay robot conectado'}>
            <input
              type="checkbox"
              checked={speakOnRobot && !!robotId}
              disabled={!robotId}
              onChange={(e) => setSpeakOnRobot(e.target.checked)}
            />
            Que lo diga el robot
          </label>
        </div>
      </header>

      <div className="chat-list" ref={listRef}>
        {messages.length === 0 && (
          <p className="muted">
            Escribile algo para probar la personalidad{sttSupported ? ', o tocá el micrófono y hablale' : ''}.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            {m.role === 'assistant' && m.emotion && <span className="tag">{EMOTION_LABELS[m.emotion] || m.emotion}</span>}
            {m.text}
          </div>
        ))}
        {sending && <div className="bubble assistant typing">…</div>}
      </div>

      <form className="chat-input" onSubmit={submit}>
        {sttSupported && (
          <button
            type="button"
            className={`mic ${listening ? 'on' : ''}`}
            onClick={toggleMic}
            disabled={sending}
            aria-label={listening ? 'Dejar de escuchar' : 'Hablarle'}
            title={listening ? 'Escuchando… tocá para cortar' : 'Hablarle'}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
            </svg>
          </button>
        )}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={listening ? 'Escuchando…' : 'Decile algo…'}
          disabled={sending || listening}
        />
        <button type="submit" disabled={!text.trim() || sending || listening}>
          Enviar
        </button>
      </form>
    </section>
  );
}
