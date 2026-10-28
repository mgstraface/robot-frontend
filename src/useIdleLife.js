import { useCallback, useEffect, useRef, useState } from 'react';
import { IDLE_ACTIONS, idleActionsFor } from './components/Face.jsx';

// Cuánto espera en neutral antes de hacer algo, y cada cuánto repite
const FIRST_DELAY = [5000, 9000];
const BETWEEN = [6000, 14000];
// Si nadie interactúa en este tiempo, se duerme
const SLEEP_AFTER = 3 * 60 * 1000;


const rand = ([min, max]) => min + Math.random() * (max - min);

/**
 * "Vida propia": mientras la emoción es neutral, programa acciones al azar
 * (mirar, pelota, pensar, bostezo, tararear o curiosear; en estilo terror, acechar y glitch) y lo duerme si pasa mucho tiempo sin actividad.
 * poke() registra actividad: corta la acción en curso y lo despierta.
 */
export function useIdleLife({ emotion, enabled, faceStyle = 'tierno' }) {
  const [action, setAction] = useState(null);
  const [pokes, setPokes] = useState(0);
  const lastActivity = useRef(Date.now());
  const lastAction = useRef(null);
  const timer = useRef(null);

  const poke = useCallback(() => {
    lastActivity.current = Date.now();
    setPokes((n) => n + 1); // reinicia la programación de acciones
  }, []);

  useEffect(() => {
    clearTimeout(timer.current);
    setAction(null);
    if (!enabled || emotion !== 'neutral') return undefined;

    const next = () => {
      if (Date.now() - lastActivity.current > SLEEP_AFTER) {
        setAction('dormir'); // queda dormido hasta el próximo poke()
        return;
      }
      const options = idleActionsFor(faceStyle).filter((a) => a !== lastAction.current);
      const chosen = options[Math.floor(Math.random() * options.length)];
      lastAction.current = chosen;
      setAction(chosen);
      timer.current = setTimeout(() => {
        setAction(null);
        timer.current = setTimeout(next, rand(BETWEEN));
      }, IDLE_ACTIONS[chosen].ms);
    };

    timer.current = setTimeout(next, rand(FIRST_DELAY));
    return () => clearTimeout(timer.current);
  }, [emotion, enabled, pokes, faceStyle]);

  return { action, poke };
}
