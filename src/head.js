import { useCallback, useEffect, useRef, useState } from 'react';

// Cuello de 2 servos: pan = giro horizontal (± a la derecha), tilt = vertical (+ mira para arriba).
// Mismos límites que el robot real.
export const PAN_MAX = 80;
export const TILT_MAX = 25;

export const GESTURE_LABELS = {
  asentir: 'Sí',
  negar: 'No',
  mirarArriba: 'Arriba',
  mirarAbajo: 'Abajo',
  mirarIzquierda: 'Izquierda',
  mirarDerecha: 'Derecha',
  ladear: 'Ladear',
};

// Duración de cada gesto (ms); el robot usa las mismas
export const GESTURE_MS = {
  asentir: 1200,
  negar: 1300,
  mirarArriba: 1600,
  mirarAbajo: 1600,
  mirarIzquierda: 1600,
  mirarDerecha: 1600,
  ladear: 1600,
};

// Postura de la cabeza según la emoción
export const POSTURES = {
  neutral: { pan: 0, tilt: 0 },
  feliz: { pan: 0, tilt: 8 },
  triste: { pan: 0, tilt: -20 },
  sorprendido: { pan: 0, tilt: 18 },
  enojado: { pan: 0, tilt: -8 },
  pensando: { pan: 22, tilt: 14 },
  dormido: { pan: 0, tilt: -25 },
  amor: { pan: -10, tilt: 6 },
  curioso: { pan: 24, tilt: 10 },
  escuchando: { pan: 12, tilt: 4 },
  mareado: { pan: 0, tilt: 0 },
  asustado: { pan: -15, tilt: -10 },
  picaro: { pan: 12, tilt: -4 },
  aburrido: { pan: 0, tilt: -12 },
  riendo: { pan: 0, tilt: 15 },
};

const clamp = (v, m) => Math.max(-m, Math.min(m, v));
const rand = (a, b) => a + Math.random() * (b - a);

/**
 * Posición de la cabeza en el panel: postura según la emoción, gestos puntuales
 * y, en neutral, miradas al azar ("vida propia"). glance() la hace mirar hacia un lado un rato.
 */
export function useHead({ emotion, idle, faceStyle }) {
  const [gesture, setGesture] = useState(null);
  const [glancePose, setGlancePose] = useState(null);
  const timers = useRef({});

  const later = (name, fn, ms) => {
    clearTimeout(timers.current[name]);
    timers.current[name] = setTimeout(fn, ms);
  };

  const playGesture = useCallback((g) => {
    if (!GESTURE_MS[g]) return;
    setGesture(null);
    // un frame en null para que la animación arranque de nuevo si se repite el mismo gesto
    requestAnimationFrame(() => setGesture(g));
    later('gesture', () => setGesture(null), GESTURE_MS[g]);
  }, []);

  const glance = useCallback((pan, tilt = 0, ms = 2500) => {
    setGlancePose({ pan: clamp(pan, PAN_MAX), tilt: clamp(tilt, TILT_MAX) });
    later('glance', () => setGlancePose(null), ms);
  }, []);

  // Miradas al azar mientras está tranquilo. En terror: se queda quieto y gira de golpe hacia vos.
  useEffect(() => {
    if (!idle) return undefined;
    let t;
    const tick = () => {
      if (faceStyle === 'terror' && Math.random() < 0.35) {
        glance(rand(-60, 60), rand(-5, 5), 4000);
      } else {
        glance(rand(-35, 35), rand(-8, 12), rand(1500, 3000));
      }
      t = setTimeout(tick, rand(4000, 9000));
    };
    t = setTimeout(tick, rand(2500, 5000));
    return () => clearTimeout(t);
  }, [idle, faceStyle, glance]);

  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), []);

  const base = POSTURES[emotion] || POSTURES.neutral;
  const pose = glancePose || base;
  return { pose, gesture, playGesture, glance };
}
