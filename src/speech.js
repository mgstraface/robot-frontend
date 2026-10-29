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
}

function speakBrowser(text) {
  return new Promise((resolve) => {
    if (!ttsSupported) return resolve();
    const u = new SpeechSynthesisUtterance(text);
    const voice = pickVoice();
    if (voice) u.voice = voice;
    u.lang = voice?.lang || 'es-AR';
    u.pitch = 1.35; // un poco más agudo: suena más a mascota
    u.rate = 1.05;
    u.onend = resolve;
    u.onerror = resolve;
    window.speechSynthesis.speak(u);
  });
}

async function speakServer(text) {
  const blob = await api.tts(text);
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  currentAudio = audio;
  await new Promise((resolve) => {
    audio.onended = resolve;
    audio.onerror = resolve;
    audio.play().catch(resolve);
  });
  URL.revokeObjectURL(url);
  if (currentAudio === audio) currentAudio = null;
}

/** Voz grave y lenta para las risas y sonidos de la vida propia en modo terror. */
export function speakSpooky(text) {
  if (!ttsSupported) return;
  const u = new SpeechSynthesisUtterance(text);
  const voice = pickVoice();
  if (voice) u.voice = voice;
  u.lang = voice?.lang || 'es-AR';
  u.pitch = 0.1;
  u.rate = 0.75;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

// Avisa cuando empieza y termina de hablar (la cara mueve la boca mientras tanto)
let talkId = 0;
function setTalking(on) {
  window.dispatchEvent(new CustomEvent('robot-talking', { detail: on }));
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
