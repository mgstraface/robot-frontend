import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { forgetPhoto, photoUrl, resizeForRobot } from '../photos.js';

const FACE_SECS = [30, 60, 120, 300];
const PHOTO_SECS = [5, 10, 15, 30];

function label(sec) {
  return sec < 60 ? `${sec} segundos` : `${sec / 60} min`;
}

function Thumb({ id, onDelete }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    let alive = true;
    photoUrl(id)
      .then((u) => alive && setSrc(u))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [id]);
  return (
    <div className="photo-item">
      {src && <img src={src} alt="" />}
      <button type="button" onClick={() => onDelete(id)} aria-label="Borrar foto" title="Borrar">
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

/** Portarretrato: fotos que se intercalan con la cara. Se achican en el navegador al tamaño de la pantalla del robot. */
export default function PhotosPanel({ photos, settings, onPhotos, onSettings, onPreview, onError }) {
  const [uploading, setUploading] = useState('');

  async function upload(e) {
    const files = [...(e.target.files || [])];
    e.target.value = '';
    if (!files.length) return;
    try {
      for (let i = 0; i < files.length; i++) {
        setUploading(`Subiendo ${i + 1} de ${files.length}…`);
        const blob = await resizeForRobot(files[i]);
        await api.uploadPhoto(blob);
      }
    } catch (err) {
      onError(err);
    } finally {
      setUploading('');
      onPhotos();
    }
  }

  async function remove(id) {
    try {
      await api.deletePhoto(id);
      forgetPhoto(id);
      onPhotos();
    } catch (err) {
      onError(err);
    }
  }

  async function save(patch) {
    try {
      onSettings(await api.saveSettings(patch));
    } catch (err) {
      onError(err);
    }
  }

  return (
    <div className="routines">
      <h3>Portarretrato</h3>
      <p className="hint">
        Cuando está tranquilo, va intercalando su cara con tus fotos. En el robot se guardan en la tarjeta SD y se sincronizan solas por
        WiFi cuando subís o borrás alguna.
      </p>
      {settings && (
        <>
          <label className="check">
            <input type="checkbox" checked={settings.frameEnabled} onChange={(e) => save({ frameEnabled: e.target.checked })} />
            Mostrar fotos
          </label>
          <div className="inline" style={{ marginTop: '0.4rem' }}>
            <span>Cara</span>
            <select value={settings.frameFaceSec} onChange={(e) => save({ frameFaceSec: Number(e.target.value) })} aria-label="Tiempo de la cara">
              {FACE_SECS.map((s) => (
                <option key={s} value={s}>
                  {label(s)}
                </option>
              ))}
            </select>
            <span>· cada foto</span>
            <select value={settings.framePhotoSec} onChange={(e) => save({ framePhotoSec: Number(e.target.value) })} aria-label="Tiempo de cada foto">
              {PHOTO_SECS.map((s) => (
                <option key={s} value={s}>
                  {label(s)}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      <div className="row">
        <label className="upload">
          <input type="file" accept="image/*" multiple onChange={upload} disabled={Boolean(uploading)} />
          {uploading || 'Subir fotos'}
        </label>
        {photos.length > 0 && (
          <button type="button" className="ghost" onClick={onPreview}>
            Ver una en la cara
          </button>
        )}
      </div>

      {photos.length === 0 ? (
        <p className="muted">Todavía no hay fotos. Se recortan solas al formato de la pantalla del robot (apaisado).</p>
      ) : (
        <div className="photo-grid">
          {photos.map((p) => (
            <Thumb key={p.id} id={p.id} onDelete={remove} />
          ))}
        </div>
      )}
    </div>
  );
}
