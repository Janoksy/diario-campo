/* Diario de Campo · transcriptor de voz (Whisper, corre dentro del teléfono) */
import { pipeline, env } from './vendor/transformers.min.js';
env.allowLocalModels = false;
env.useBrowserCache = true;
env.backends.onnx.wasm.wasmPaths = new URL('./vendor/', self.location.href).href;
env.backends.onnx.wasm.numThreads = self.crossOriginIsolated ? Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 2) - 1)) : 1;

let tubo = null, actual = null;
async function cargar(modelo, id) {
  if (tubo && actual === modelo) return tubo;
  if (tubo) { try { await tubo.dispose(); } catch (e) {} tubo = null; actual = null; }
  const archivos = {};
  tubo = await pipeline('automatic-speech-recognition', modelo, {
    device: 'wasm',
    dtype: 'q8',
    progress_callback: p => {
      if (p.status === 'progress' && p.total) {
        archivos[p.file] = { c: p.loaded, t: p.total };
        let c = 0, t = 0;
        for (const k in archivos) { c += archivos[k].c; t += archivos[k].t; }
        postMessage({ id, t: 'descarga', pct: Math.min(100, Math.floor(c / t * 100)) });
      }
    }
  });
  actual = modelo;
  return tubo;
}

self.onmessage = async e => {
  const m = e.data;
  try {
    const p = await cargar(m.modelo, m.id);
    if (m.t === 'precargar') { postMessage({ id: m.id, t: 'fin' }); return; }
    postMessage({ id: m.id, t: 'procesando' });
    const out = await p(m.audio, { language: 'spanish', task: 'transcribe', chunk_length_s: 30, stride_length_s: 5 });
    const texto = (Array.isArray(out) ? out.map(o => o.text).join(' ') : (out.text || '')).replace(/\s+/g, ' ').trim();
    postMessage({ id: m.id, t: 'fin', texto });
  } catch (err) {
    postMessage({ id: m.id, t: 'error', msg: String((err && err.message) || err) });
  }
};
