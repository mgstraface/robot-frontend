const BASE = import.meta.env.VITE_API_URL || '';
const TOKEN_KEY = 'robot_admin_token';

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* sin storage: el token dura lo que la pestaña */
  }
}

export class UnauthorizedError extends Error {}

async function request(path, { method = 'GET', body, token = getToken() } = {}) {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) throw new UnauthorizedError('Token inválido');
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

export const api = {
  config: (token) => request('/config', { token }),
  getPersonality: () => request('/personality'),
  savePersonality: (data) => request('/personality', { method: 'PUT', body: data }),
  messages: (deviceId, limit = 100) =>
    request(`/messages?limit=${limit}${deviceId ? `&deviceId=${encodeURIComponent(deviceId)}` : ''}`),
  clearMessages: (deviceId) =>
    request(`/messages${deviceId ? `?deviceId=${encodeURIComponent(deviceId)}` : ''}`, { method: 'DELETE' }),
  status: () => request('/robot/status'),
  servo: (servo, angle) => request('/robot/servo', { method: 'POST', body: { servo, angle } }),
  servoStop: () => request('/robot/servo/stop', { method: 'POST' }),
  robotTest: (what) => request('/robot/test', { method: 'POST', body: { what } }),
  expression: (emotion, deviceId) => request('/robot/expression', { method: 'POST', body: { emotion, deviceId } }),
  say: (text, emotion, deviceId) => request('/robot/say', { method: 'POST', body: { text, emotion, deviceId } }),
  settings: () => request('/settings'),
  saveSettings: (data) => request('/settings', { method: 'PUT', body: data }),
  geo: (q) => request(`/geo?q=${encodeURIComponent(q)}`),
  weather: () => request('/weather'),
  calendarUpcoming: () => request('/calendar/upcoming'),
  briefing: () => request('/briefing', { method: 'POST' }),
  feed: (after) => request(`/feed?after=${after}`),
  mood: () => request('/mood'),
  recetaFormato: () => request('/recetas/formato'),
  recetas: () => request('/recetas'),
  addReceta: (data) => request('/recetas', { method: 'POST', body: data }),
  deleteReceta: (id) => request(`/recetas/${id}`, { method: 'DELETE' }),
  cocina: () => request('/cocina'),
  cocinaStart: (recetaId) => request('/cocina/start', { method: 'POST', body: { recetaId } }),
  cocinaAccion: (accion) => request(`/cocina/${accion}`, { method: 'POST' }),
  timers: () => request('/timers'),
  addTimer: (segundos, texto) => request('/timers', { method: 'POST', body: { segundos, texto } }),
  clearTimers: () => request('/timers', { method: 'DELETE' }),
  memories: () => request('/memories'),
  addMemory: (text) => request('/memories', { method: 'POST', body: { text } }),
  deleteMemory: (id) => request(`/memories/${id}`, { method: 'DELETE' }),
  moodEvent: (kind) => request('/mood/event', { method: 'POST', body: { kind } }),
  focus: () => request('/focus'),
  startFocus: (minutes) => request('/focus', { method: 'POST', body: { minutes } }),
  stopFocus: () => request('/focus', { method: 'DELETE' }),
  gesture: (gesture) => request('/gesture', { method: 'POST', body: { gesture } }),
  action: (action, weather) => request('/action', { method: 'POST', body: { action, weather } }),
  photos: () => request('/photos'),
  photoBlob: async (id) => {
    const res = await fetch(`${BASE}/api/photos/${id}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.status === 401) throw new UnauthorizedError('Token inválido');
    if (!res.ok) throw new Error(`No se pudo bajar la foto (${res.status})`);
    return res.blob();
  },
  uploadPhoto: async (blob) => {
    const res = await fetch(`${BASE}/api/photos`, {
      method: 'POST',
      headers: { 'Content-Type': 'image/jpeg', Authorization: `Bearer ${getToken()}` },
      body: blob,
    });
    if (res.status === 401) throw new UnauthorizedError('Token inválido');
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
    return data;
  },
  deletePhoto: (id) => request(`/photos/${id}`, { method: 'DELETE' }),
  tryRoutine: (kind) => request(`/try/${kind}`, { method: 'POST' }),
  chat: (text, speakOn) => request('/chat', { method: 'POST', body: { text, deviceId: 'panel', speakOn } }),
  // Devuelve un Blob de audio (WAV) con la voz del servidor
  tts: async (text) => {
    const res = await fetch(`${BASE}/api/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ text }),
    });
    if (res.status === 401) throw new UnauthorizedError('Token inválido');
    if (!res.ok) throw new Error(`Voz del servidor: error ${res.status}`);
    return res.blob();
  },
};
