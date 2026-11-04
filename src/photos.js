import { api } from './api.js';

// Tamaño de la pantalla del robot acostada (Waveshare 1,47": 320×172)
export const PHOTO_W = 320;
export const PHOTO_H = 172;

const urls = new Map(); // id → object URL (cache para no bajar la misma foto dos veces)

export async function photoUrl(id) {
  if (!urls.has(id)) urls.set(id, URL.createObjectURL(await api.photoBlob(id)));
  return urls.get(id);
}

export function forgetPhoto(id) {
  const url = urls.get(id);
  if (url) URL.revokeObjectURL(url);
  urls.delete(id);
}

/** Achica una foto al tamaño de la pantalla del robot (recorte centrado) y la devuelve como JPEG. */
export async function resizeForRobot(file) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = PHOTO_W;
  canvas.height = PHOTO_H;
  const ctx = canvas.getContext('2d');
  const scale = Math.max(PHOTO_W / bitmap.width, PHOTO_H / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, (PHOTO_W - w) / 2, (PHOTO_H - h) / 2, w, h);
  bitmap.close?.();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo procesar la foto'))), 'image/jpeg', 0.85)
  );
}
