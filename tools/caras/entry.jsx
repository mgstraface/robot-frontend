// Página que usa render.mjs: dibuja una cara del panel (el mismo componente) para sacarle "fotos".
import { createRoot } from 'react-dom/client';
import Face, { EMOTION_LABELS, IDLE_ACTIONS } from '../../src/components/Face.jsx';
import '../../src/styles.css';

let root = null;

window.LISTAS = {
  emociones: Object.keys(EMOTION_LABELS),
  acciones: Object.entries(IDLE_ACTIONS).map(([name, a]) => ({ name, ms: a.ms, modes: a.modes || null })),
};

// Monta la cara de cero (sin el fundido entre caras) y espera a que se dibuje
window.mostrar = (props) =>
  new Promise((resolve) => {
    if (root) root.unmount();
    document.getElementById('app').innerHTML = '';
    root = createRoot(document.getElementById('app'));
    root.render(<Face {...props} size={320} eyeColor="#00ff00" />);
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });

// Congela todas las animaciones en el instante t (ms)
window.enInstante = (t) => {
  for (const a of document.getAnimations()) {
    a.pause();
    a.currentTime = t;
  }
};
