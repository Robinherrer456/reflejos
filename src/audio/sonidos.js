import { bus } from '../events/bus.js'
import { SOUND_TOGGLED } from '../events/nombres.js'

// Sonidos generados con Web Audio (sin archivos). El silencio llega por evento.
let ctx = null
let activo = true
bus.on(SOUND_TOGGLED, (datos) => { activo = datos.activo })

function audio() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function tono({ tipo = 'sine', desde, hasta, dur, vol = 0.2, retraso = 0 }) {
  const a = audio()
  const t = a.currentTime + retraso
  const osc = a.createOscillator()
  const g = a.createGain()
  osc.type = tipo
  osc.frequency.setValueAtTime(desde, t)
  osc.frequency.exponentialRampToValueAtTime(Math.max(hasta, 1), t + dur)
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(g).connect(a.destination)
  osc.start(t)
  osc.stop(t + dur + 0.02)
}

function ruido({ dur, vol, filtro }) {
  const a = audio()
  const n = Math.floor(a.sampleRate * dur)
  const buf = a.createBuffer(1, n, a.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n)
  const src = a.createBufferSource()
  src.buffer = buf
  const f = a.createBiquadFilter()
  f.type = 'lowpass'
  f.frequency.value = filtro
  const g = a.createGain()
  g.gain.value = vol
  src.connect(f).connect(g).connect(a.destination)
  src.start()
}

export const sonidos = {
  disparo() {
    if (!activo) return
    ruido({ dur: 0.14, vol: 0.38, filtro: 3200 })
    tono({ tipo: 'square', desde: 190, hasta: 45, dur: 0.11, vol: 0.16 })
  },
  acierto() {
    if (!activo) return
    tono({ desde: 900, hasta: 1400, dur: 0.1, vol: 0.2 })
    tono({ desde: 1400, hasta: 1900, dur: 0.12, vol: 0.14, retraso: 0.06 })
  },
  fallo() {
    if (!activo) return
    tono({ tipo: 'triangle', desde: 240, hasta: 110, dur: 0.14, vol: 0.1 })
  },
  tic() {
    if (!activo) return
    tono({ tipo: 'square', desde: 700, hasta: 680, dur: 0.07, vol: 0.08 })
  },
  final() {
    if (!activo) return
    tono({ desde: 660, hasta: 660, dur: 0.14, vol: 0.18 })
    tono({ desde: 520, hasta: 520, dur: 0.14, vol: 0.18, retraso: 0.15 })
    tono({ desde: 390, hasta: 330, dur: 0.3, vol: 0.18, retraso: 0.3 })
  },
}
