// Voz en la PC: el robot habla por los parlantes y escucha por el micrófono del navegador.
// Si el servidor tiene voz configurada (OpenAI) usa esa; si no, la voz del navegador (gratis).
import { api } from './api.js';

let currentAudio = null;

export function isIOS() {
  return typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
}

export const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

const Recognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
export const sttSupported = Boolean(Recognition);

/**
 * Arregla el texto para que la voz lo lea bien:
 * - palabras en MAYÚSCULAS (GOOOL) las deletrea → las pasa a minúsculas
 * - más de 3 letras repetidas (goooooool) → 3
 * - risas sueltas ("je, je, je") las lee como letras → "jejeje"
 */
export function forSpeech(text) {
  return String(text || '')
    .replace(/\b[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ']+\b/g, (w) => w.toLowerCase())
    .replace(/([a-záéíóúñ])\1{3,}/gi, '$1$1$1')
    .replace(/\b(j[aeiou])(?:[\s,.…]+\1)+\b/gi, (m, syl) => syl.toLowerCase().repeat(Math.min(4, m.split(/[\s,.…]+/).length)));
}

function pickVoice() {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === 'es-AR') ||
    voices.find((v) => v.lang?.startsWith('es') && /google/i.test(v.name)) ||
    voices.find((v) => v.lang === 'es-US' || v.lang === 'es-MX') ||
    voices.find((v) => v.lang?.startsWith('es')) ||
    null
  );
}

// Chrome carga las voces de forma asíncrona
if (ttsSupported) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}

export function stopSpeaking() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if (ttsSupported) window.speechSynthesis.cancel();
  setTalking(false);
}

function speakBrowser(text) {
  return new Promise((resolve) => {
    if (!ttsSupported) return resolve();
    const u = new SpeechSynthesisUtterance(forSpeech(text));
    const voice = pickVoice();
    if (voice) u.voice = voice;
    u.lang = voice?.lang || 'es-AR';
    u.pitch = 1.35; // un poco más agudo: suena más a mascota
    u.rate = 1.05;
    // Chrome a veces no avisa que terminó: corte de seguridad según el largo del texto
    const safety = setTimeout(resolve, 2000 + String(text).length * 90);
    const done = () => {
      clearTimeout(safety);
      resolve();
    };
    u.onend = done;
    u.onerror = done;
    window.speechSynthesis.speak(u);
  });
}

// Un solo elemento de audio reutilizado: en iPhone, una vez "desbloqueado" con un toque, puede sonar después
// aunque el audio llegue unos segundos más tarde (si no, Safari lo bloquea).
const SILENCIO = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
let player = null;
function getPlayer() {
  if (!player && typeof Audio !== 'undefined') player = new Audio();
  return player;
}

/** Llamar en el momento del toque (antes de esperar nada) para que el audio pueda sonar en iPhone. */
export function unlockAudio() {
  const p = getPlayer();
  if (!p || p.dataset?.unlocked) return;
  p.src = SILENCIO;
  p.play()
    .then(() => {
      p.dataset.unlocked = '1';
    })
    .catch(() => {});
}

async function speakServer(text) {
  const p = getPlayer();
  unlockAudio();
  const blob = await api.tts(forSpeech(text));
  const url = URL.createObjectURL(blob);
  p.src = url;
  currentAudio = p;
  try {
    await new Promise((resolve, reject) => {
      // termina al llegar al final, si lo pausan (otro audio lo corta) o, por las dudas, a los 60 s
      const safety = setTimeout(resolve, 60000);
      const done = () => {
        clearTimeout(safety);
        resolve();
      };
      p.onended = done;
      p.onpause = done;
      p.onerror = () => {
        clearTimeout(safety);
        reject(new Error('No se pudo reproducir el audio'));
      };
      p.play().catch((err) => {
        clearTimeout(safety);
        reject(err);
      });
    });
  } finally {
    URL.revokeObjectURL(url);
    if (currentAudio === p) currentAudio = null;
  }
}

/** Voz grave y lenta para las risas y sonidos de la vida propia en modo terror. */
export function speakSpooky(text) {
  if (!ttsSupported) return;
  const u = new SpeechSynthesisUtterance(forSpeech(text));
  const voice = pickVoice();
  if (voice) u.voice = voice;
  u.lang = voice?.lang || 'es-AR';
  u.pitch = 0.4; // muy grave (0.1) algunas voces lo distorsionan y no se entiende
  u.rate = 0.75;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

// Avisa cuando empieza y termina de hablar (la cara mueve la boca mientras tanto)
let talkId = 0;
let talkingNow = false;
function setTalking(on) {
  window.dispatchEvent(new CustomEvent('robot-talking', { detail: on }));
  // la placa no tiene parlante todavía: se le avisa para que mueva la boca mientras suena acá
  if (on !== talkingNow) {
    talkingNow = on;
    api.robotTalking(on).catch(() => {});
  }
}

/** Dice el texto en voz alta. Devuelve una promesa que termina cuando deja de hablar. */
export async function speak(text, { serverVoice = false } = {}) {
  stopSpeaking();
  const id = ++talkId;
  setTalking(true);
  try {
    if (serverVoice) {
      try {
        return await speakServer(text);
      } catch {
        /* si falla la voz del servidor, sigue con la del navegador */
      }
    }
    return await speakBrowser(text);
  } finally {
    if (id === talkId) setTalking(false);
  }
}

/**
 * Escucha una frase por el micrófono (Chrome/Edge). Resuelve con el texto reconocido ('' si no entendió).
 * Devuelve { promise, stop } para poder cortar antes.
 */
export function listen() {
  const rec = new Recognition();
  rec.lang = 'es-AR';
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  const promise = new Promise((resolve, reject) => {
    let text = '';
    rec.onresult = (e) => {
      text = e.results[0]?.[0]?.transcript || '';
    };
    rec.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') resolve('');
      else if (e.error === 'not-allowed') reject(new Error('El navegador no tiene permiso para usar el micrófono: habilitalo en los ajustes del sitio.'));
      else if (e.error === 'service-not-allowed') {
        reject(
          new Error(
            isIOS()
              ? 'En iPhone el dictado por voz solo funciona en Safari y con "Dictado" activado (Ajustes → General → Teclado). Mientras tanto, usá el micrófono del teclado para dictar.'
              : 'Este navegador no deja usar el reconocimiento de voz. Probá con Chrome o Edge, o dictá con el micrófono del teclado.'
          )
        );
      } else if (e.error === 'network') reject(new Error('El reconocimiento de voz necesita conexión a internet.'));
      else reject(new Error(`Micrófono: ${e.error}`));
    };
    rec.onend = () => resolve(text.trim());
  });
  rec.start();
  return { promise, stop: () => rec.stop() };
}

// Desbloquea el audio con el primer toque en cualquier parte del panel
if (typeof window !== 'undefined') {
  const once = () => {
    unlockAudio();
    window.removeEventListener('pointerdown', once);
    window.removeEventListener('touchend', once);
  };
  window.addEventListener('pointerdown', once);
  window.addEventListener('touchend', once);
}
