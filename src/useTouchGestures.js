import { useRef } from 'react';

// Gestos sobre la pantalla del robot (los mismos que va a reconocer el firmware):
// toque, tres toques rápidos, mantener apretado y deslizar en 4 direcciones.
const SWIPE_PX = 40;
const LONG_MS = 650;
const MULTI_MS = 380;

export function useTouchGestures({ onTap, onTripleTap, onLongPress, onSwipe }) {
  const s = useRef({ x: 0, y: 0, t: 0, long: null, longFired: false, taps: 0, tapTimer: null });

  function down(e) {
    const st = s.current;
    // seguir recibiendo el movimiento aunque el dedo salga de la pantalla al deslizar
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      /* sin captura */
    }
    st.x = e.clientX;
    st.y = e.clientY;
    st.t = Date.now();
    st.longFired = false;
    clearTimeout(st.long);
    st.long = setTimeout(() => {
      st.longFired = true;
      onLongPress?.();
    }, LONG_MS);
  }

  function up(e) {
    const st = s.current;
    clearTimeout(st.long);
    if (st.longFired) return;
    const dx = e.clientX - st.x;
    const dy = e.clientY - st.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) >= SWIPE_PX) {
      const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'derecha' : 'izquierda') : dy > 0 ? 'abajo' : 'arriba';
      onSwipe?.(dir);
      return;
    }
    // toque: el primero responde al instante; si llegan 3 seguidos, además son "cosquillas"
    st.taps += 1;
    clearTimeout(st.tapTimer);
    if (st.taps === 1) onTap?.(e);
    if (st.taps >= 3) {
      st.taps = 0;
      onTripleTap?.();
      return;
    }
    st.tapTimer = setTimeout(() => {
      st.taps = 0;
    }, MULTI_MS);
  }

  function move(e) {
    const st = s.current;
    // si el dedo se mueve, es un deslizamiento: no cuenta como "mantener apretado"
    if (Math.abs(e.clientX - st.x) > 15 || Math.abs(e.clientY - st.y) > 15) clearTimeout(st.long);
  }

  function cancel() {
    clearTimeout(s.current.long);
  }

  return { onPointerDown: down, onPointerMove: move, onPointerUp: up, onPointerCancel: cancel };
}
