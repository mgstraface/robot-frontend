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

Se despliega con Docker junto con el backend: el `Dockerfile` hace el build y lo sirve con nginx, que también reenvía `/api` y `/ws` al contenedor `robot-backend` (ver `docker/nginx.conf`). Los pasos están en el README de [robot-backend](https://github.com/mgstraface/robot-backend).

## Caras del robot

La placa muestra las mismas caras que el panel: `tools/caras/render.mjs` le saca una "foto" a cada cuadro de cada cara y animación (con `Face.jsx`) y las guarda comprimidas en `robot-backend/firmware/data/caras.bin`. Si cambiás o agregás caras en el panel, volvé a generarlo:

```
node tools/caras/render.mjs ../robot-backend/firmware/data/caras.bin
```

(necesita esbuild, playwright y sharp; `NODE_TOOLS` = carpeta `node_modules` donde estén). `tools/caras/preview.py` decodifica el archivo y arma una hoja de muestra para revisarlo.
