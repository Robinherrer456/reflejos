import { bus } from '../events/bus.js'
import { SOUND_TOGGLED } from '../events/nombres.js'
import impactoUrl from '../assets/sonidos/impacto-orbe.mp3'

let ctx = null
let activo = true
let audioImpacto = null
bus.on(SOUND_TOGGLED, (datos) => { activo = datos.activo })

function audio() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

export function precargar() {
  if (audioImpacto) return
  audioImpacto = new Audio(impactoUrl)
  audioImpacto.preload = 'auto'
  audioImpacto.addEventListener('error', () => {
    console.error('No se pudo cargar el sonido de impacto del orbe.')
  })
  audioImpacto.load()
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

export const sonidos = {
  acierto() {
    if (!activo) return
    if (!audioImpacto) precargar()
    audioImpacto.currentTime = 0
    const reproduccion = audioImpacto.play()
    if (reproduccion) {
      reproduccion.catch((error) => {
        console.warn('No se pudo reproducir el sonido de impacto del orbe.', error)
      })
    }
  },
  fallo() {},
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
