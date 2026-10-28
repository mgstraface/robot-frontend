# robot-frontend

Panel del robot mascota (React + Vite). Se conecta a [robot-backend](https://github.com/mgstraface/robot-backend).

- **Cara simulada** con todas las expresiones (sirve de referencia para dibujarlas en la pantalla del ESP32).
- **Chat** para probar la personalidad sin hardware; con un robot conectado, puede hacer que lo diga en voz alta.
- **Personalidad**: nombre y prompt editables.
- **Memoria**: historial de conversación por dispositivo, con opción de borrarlo.
- **Eventos**: lo que hace el robot en vivo (toques, lo que escucha, lo que responde).

## Correr en local

```bash
npm install
npm run dev        # http://localhost:5173 (redirige /api al backend en :4100)
```

Entrás con el `ADMIN_TOKEN` del `.env` del backend.

## Deploy en el VPS

```bash
cd /var/www
git clone git@github.com:mgstraface/robot-frontend.git
cd robot-frontend
npm ci && npm run build      # genera dist/
```

Nginx sirve `dist/` y hace proxy de `/api` y `/ws` al backend (configuración completa en el README de robot-backend). Si el panel queda en otro dominio que la API, creá un `.env` con `VITE_API_URL=https://robot.tudominio.com` antes del build.
