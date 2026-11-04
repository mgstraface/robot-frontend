import { useState } from 'react';
import { api, setToken, UnauthorizedError } from '../api.js';
import Face from './Face.jsx';

export default function Login({ onLogin }) {
  const [token, setValue] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const cfg = await api.config(token.trim());
      setToken(token.trim());
      onLogin(cfg);
    } catch (err) {
      setError(err instanceof UnauthorizedError ? 'Token incorrecto' : `No se pudo conectar: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login">
      <Face emotion={error ? 'triste' : loading ? 'pensando' : 'curioso'} size={220} />
      <form onSubmit={submit} className="card login-card">
        <h1>Panel del robot</h1>
        <label htmlFor="token">Token de administrador</label>
        <input
          id="token"
          type="password"
          value={token}
          onChange={(e) => setValue(e.target.value)}
          placeholder="ADMIN_TOKEN del .env"
          autoFocus
        />
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={!token.trim() || loading}>
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}
