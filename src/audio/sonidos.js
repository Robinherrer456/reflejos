import { bus } from '../events/bus.js'
import { SOUND_TOGGLED } from '../events/nombres.js'
import impactoUrl from '../assets/sonidos/impacto-orbe.mp3'

let ctx = null
let activo = true
let audioImpacto = null
bus.on(SOUND_TOGGLED, (datos) => { activo = datos.activo })

function audio() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  return ctx
}

export function desbloquearSonido() {
  const a = audio()
  if (a.state === 'suspended') {
    a.resume().catch((error) => {
      console.warn('No se pudo activar el audio del juego.', error)
    })
  }
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
  const reproducir = () => {
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
  if (a.state === 'suspended') {
    a.resume().then(reproducir).catch((error) => {
      console.warn('No se pudo reproducir el efecto de sonido.', error)
    })
  } else {
    reproducir()
  }
}

export const sonidos = {
  disparo() {
    if (!activo) return
    tono({ tipo: 'triangle', desde: 180, hasta: 55, dur: 0.09, vol: 0.2 })
  },
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
  fallo() {
    if (!activo) return
    tono({ tipo: 'sawtooth', desde: 260, hasta: 120, dur: 0.11, vol: 0.09 })
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
