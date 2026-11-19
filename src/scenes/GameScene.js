import Phaser from 'phaser'
import modos from '../data/modos.json'
import escenarios from '../data/escenarios.json'
import { trazosMira } from '../utils/mira.js'
import Pistola from './Pistola.js'
import reposoUrl from '../assets/arma/arma-reposo.png'
import disparoUrl from '../assets/arma/arma-disparo.png'
import { sonidos, precargar } from '../audio/sonidos.js'
import { bus } from '../events/bus.js'
import {
  TARGET_HIT,
  TARGET_MISSED,
  TIME_UP,
  TIME_CHANGED,
  SHOT_FIRED,
  COMBO_CHANGED,
  COUNTDOWN_CHANGED,
} from '../events/nombres.js'

const hexNum = (hex) => Phaser.Display.Color.HexStringToColor(hex).color

// Camara: la sala es una caja de x (-1 a 1), v (-1 piso, 1 techo) y d (distancia 1 a 3.5)
const FOCAL = 1.25
const D_CERCA = 1
const D_FONDO = 3.5
const D_REPISA = 3.0

const rgb = (hex) => {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const mezclar = (h1, h2, t) => {
  const a = rgb(h1)
  const b = rgb(h2)
  const k = Math.min(1, Math.max(0, t))
  return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * k).toString(16).padStart(2, '0')).join('')
}
const mezclarRgb = (cadena, hex2, t) => {
  const a = cadena.match(/\d+/g).map(Number)
  const b = rgb(hex2)
  const k = Math.min(1, Math.max(0, t))
  return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * k).toString(16).padStart(2, '0')).join('')
}

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game')
  }

  preload() {
    this.load.image('arma-reposo', reposoUrl)
    this.load.image('arma-disparo', disparoUrl)
  }

  init(datos) {
    this.modo = modos.find((m) => m.id === datos.modoId) ?? modos[0]
    this.escenario = escenarios.find((e) => e.id === datos.escenarioId) ?? escenarios[0]
    this.cfgMira = {
      estilo: datos.miraEstilo ?? 'cruz',
      color: hexNum(datos.miraColor ?? '#FFFFFF'),
      escala: datos.miraEscala ?? 1,
    }
    this.sensibilidad = datos.sensibilidad ?? 1
    this.fov = datos.campoVision ?? 90
    // Con semilla, todos los jugadores online ven las mismas esferas
    this.rng =
      datos.semilla != null
        ? new Phaser.Math.RandomDataGenerator([String(datos.semilla)])
        : Phaser.Math.RND
  }

  create() {
    this.restantes = this.modo.duracionSeg
    this.puntaje = 0
    this.aciertos = 0
    this.fallos = 0
    this.disparos = 0
    this.racha = 0
    this.mejorRacha = 0
    this.reaccionTotal = 0
    this.marcaAcierto = 0
    this.marcaFallo = 0
    this.partidaIniciada = false
    this.juegoTerminado = false
    this.objetivos = []
    this.cursor = { x: 0.5, y: 0.5 }
    this.ultimoPuntero = null

    precargar()
    this.crearTexturas()
    this.dibujarSala()
    this.pistola = new Pistola(this)
    this.imagenVineta = this.add
      .image(this.scale.width / 2, this.scale.height / 2, 'vineta')
      .setDepth(30)
    this.gMira = this.add.graphics().setDepth(40)

    this.input.on('pointermove', (p) => {
      if (!this.ultimoPuntero) {
        this.ultimoPuntero = { x: p.x, y: p.y }
        return
      }
      this.cursor.x = Phaser.Math.Clamp(
        this.cursor.x + ((p.x - this.ultimoPuntero.x) * this.sensibilidad) / this.scale.width,
        0,
        1
      )
      this.cursor.y = Phaser.Math.Clamp(
        this.cursor.y + ((p.y - this.ultimoPuntero.y) * this.sensibilidad) / this.scale.height,
        0,
        1
      )
      this.ultimoPuntero.x = p.x
      this.ultimoPuntero.y = p.y
    })

    this.input.on('pointerdown', () => {
      if (!this.pistola || !this.partidaIniciada || this.juegoTerminado) return
      const x = this.cursor.x * this.scale.width
      const y = this.cursor.y * this.scale.height
      this.disparos++
      this.pistola.disparar()
      sonidos.disparo()
      this.cameras.main.shake(50, 0.0025)
      bus.emit(SHOT_FIRED)
      const objetivo = [...this.objetivos].reverse().find((o) => {
        const dx = x - o.xPantalla
        const dy = y - o.yPantalla
        return dx * dx + dy * dy <= o.r * o.r
      })
      if (objetivo) this.acertar(objetivo)
      else {
        this.agujero(x, y)
        this.fallar()
      }
    })

    bus.emit(TIME_CHANGED, { segundos: this.restantes })
    this.scale.on('resize', this.redimensionarSala, this)
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.redimensionarSala, this)
    })
    this.iniciarCuentaAtras()
  }

  iniciarCuentaAtras() {
    let restante = 3
    bus.emit(COUNTDOWN_CHANGED, { restante })
    sonidos.tic()
    this.time.addEvent({
      delay: 1000,
      repeat: 2,
      callback: () => {
        if (this.juegoTerminado) return
        restante--
        if (restante > 0) {
          bus.emit(COUNTDOWN_CHANGED, { restante })
          sonidos.tic()
        } else {
          bus.emit(COUNTDOWN_CHANGED, { restante: 0 })
          this.iniciarPartida()
        }
      },
    })
  }

  iniciarPartida() {
    if (this.juegoTerminado) return
    this.partidaIniciada = true
    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        this.restantes--
        bus.emit(TIME_CHANGED, { segundos: this.restantes })
        if (this.restantes > 0 && this.restantes <= 3) sonidos.tic()
        if (this.restantes <= 0) this.terminar()
      },
    })

    this.time.addEvent({
      delay: this.modo.apareceCadaMs,
      loop: true,
      callback: () => this.crearObjetivo(),
    })
  }

  update(tiempo, delta) {
    const puntero = this.input.activePointer
    this.pistola?.actualizar(puntero, tiempo, delta)
    if (this.gMira) {
      this.dibujarMira(
        { x: this.cursor.x * this.scale.width, y: this.cursor.y * this.scale.height },
        delta
      )
    }
  }

  // Proyeccion en perspectiva: (x, v, d) del espacio 3D a pixeles de pantalla
  proyectar(x, v, d) {
    const { width: W, height: H } = this.scale
    const lente = Math.tan(Math.PI / 4) / Math.tan((this.fov * Math.PI) / 360)
    const sc = (FOCAL * lente) / d
    return { x: W / 2 + x * (W / 2) * sc, y: H * 0.47 - v * (H / 2) * sc, sc }
  }

  crearTexturas() {
    const { width: W, height: H } = this.scale
    const e = this.escenario

    if (!this.textures.exists('esfera')) {
      const esf = this.textures.createCanvas('esfera', 64, 64)
      const c = esf.getContext()
      const g = c.createRadialGradient(24, 22, 4, 32, 32, 32)
      g.addColorStop(0, e.esfera[0])
      g.addColorStop(0.4, e.esfera[1])
      g.addColorStop(1, e.esfera[2])
      c.fillStyle = g
      c.beginPath()
      c.arc(32, 32, 31, 0, Math.PI * 2)
      c.fill()
      esf.refresh()
    }

    if (this.textures.exists('vineta')) this.textures.remove('vineta')
    const vin = this.textures.createCanvas('vineta', W, H)
    const c = vin.getContext()
    const g = c.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.9)
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(1, 'rgba(0,0,0,' + e.vineta + ')')
    c.fillStyle = g
    c.fillRect(0, 0, W, H)
    vin.refresh()
  }

  redimensionarSala() {
    if (!this.gMira || !this.imagenVineta) return
    this.imagenSala?.destroy()
    this.imagenVineta.destroy()
    this.textures.remove('sala')
    this.crearTexturas()
    this.dibujarSala()
    this.imagenVineta = this.add
      .image(this.scale.width / 2, this.scale.height / 2, 'vineta')
      .setDepth(30)
    for (const objetivo of this.objetivos) {
      this.actualizarObjetivo(objetivo)
      objetivo.aparicion?.stop()
      objetivo.esfera.setScale((objetivo.r * 2) / 64)
    }
  }

  // La sala se dibuja desde escenarios.json con perspectiva real y neblina por distancia
  dibujarSala() {
    const { width: W, height: H } = this.scale
    const e = this.escenario
    const tex = this.textures.createCanvas('sala', W, H)
    const c = tex.getContext()
    const P = (x, v, d) => this.proyectar(x, v, d)
    const nebl = (d) => ((d - D_CERCA) / (D_FONDO - D_CERCA)) * e.nieblaFuerza
    const abierto = e.ambiente.startsWith('abierto')
    const ancho = e.anchoSala
    const techo = e.altoTecho

    const quad = (a, b, cc, dd, color, linea) => {
      c.fillStyle = color
      c.beginPath()
      c.moveTo(a.x, a.y)
      c.lineTo(b.x, b.y)
      c.lineTo(cc.x, cc.y)
      c.lineTo(dd.x, dd.y)
      c.closePath()
      c.fill()
      if (linea) {
        c.strokeStyle = linea
        c.lineWidth = e.ambiente === 'abierto-neon' ? 2 : 1
        c.stroke()
      }
    }

    const cielo = c.createLinearGradient(0, 0, 0, H * 0.76)
    cielo.addColorStop(0, e.cieloArriba)
    cielo.addColorStop(1, e.cieloAbajo)
    c.fillStyle = cielo
    c.fillRect(0, 0, W, H)

    if (e.id === 'neon') {
      for (let i = 0; i < 90; i++) {
        const x = ((i * 73 + 19) % 997) / 997 * W
        const y = ((i * 41 + 7) % 503) / 503 * H * 0.57
        c.fillStyle = i % 7 === 0 ? 'rgba(112,229,255,.9)' : 'rgba(220,236,255,.65)'
        c.fillRect(x, y, i % 7 === 0 ? 2 : 1, i % 7 === 0 ? 2 : 1)
      }
    } else if (e.id === 'atardecer') {
      const solY = H * 0.46
      const brillo = c.createRadialGradient(W * 0.5, solY, 8, W * 0.5, solY, H * 0.4)
      brillo.addColorStop(0, 'rgba(255,226,164,.75)')
      brillo.addColorStop(1, 'rgba(255,174,128,0)')
      c.fillStyle = brillo
      c.fillRect(0, 0, W, H * 0.8)
      c.fillStyle = '#ffe5ae'
      c.beginPath()
      c.arc(W * 0.5, solY, Math.min(W, H) * 0.075, 0, Math.PI * 2)
      c.fill()
      c.fillStyle = '#70445f'
      c.beginPath()
      c.moveTo(0, H * 0.64)
      for (let i = 0; i <= 8; i++) {
        const x = (W * i) / 8
        const y = H * (0.57 + ((i * 17) % 4) * 0.025)
        c.lineTo(x, y)
      }
      c.lineTo(W, H * 0.72)
      c.lineTo(0, H * 0.72)
      c.closePath()
      c.fill()
    }

    const NX = e.cuadriculaX
    const ND = e.cuadriculaD
    const NV = e.id === 'clara' ? 12 : 7
    const dStep = (j) => D_CERCA + ((D_FONDO - D_CERCA) * j) / ND
    const color = (base, alt, par, d) => mezclar(par ? base : alt, e.niebla, nebl(d))
    const alt = (base) => mezclar(base, e.contraste, 0.07)

    // Pared del fondo y techo solo en los escenarios cerrados.
    if (!abierto) {
      for (let i = 0; i < NX; i++) {
        for (let k = 0; k < NV; k++) {
          const x0 = -ancho + (2 * ancho * i) / NX
          const x1 = -ancho + (2 * ancho * (i + 1)) / NX
          const v0 = -1 + ((techo + 1) * k) / NV
          const v1 = -1 + ((techo + 1) * (k + 1)) / NV
          quad(P(x0, v1, D_FONDO), P(x1, v1, D_FONDO), P(x1, v0, D_FONDO), P(x0, v0, D_FONDO),
            color(e.paredFondo, alt(e.paredFondo), (i + k) % 2, D_FONDO))
        }
      }

      for (let j = 0; j < ND; j++) {
        for (let i = 0; i < NX; i++) {
          const d0 = dStep(j)
          const d1 = dStep(j + 1)
          const x0 = -ancho + (2 * ancho * i) / NX
          const x1 = -ancho + (2 * ancho * (i + 1)) / NX
          const luz = e.panelesLuz
            ? i % 4 === 1 && j % 5 === 2
            : e.id === 'oscura' && i % 3 === 1 && j % 4 === 2
          const base = luz ? mezclar(e.techo, e.luzCenital, e.panelesLuz ? 0.6 : 0.25) : e.techo
          quad(P(x0, techo, d0), P(x1, techo, d0), P(x1, techo, d1), P(x0, techo, d1),
            color(base, alt(base), (i + j) % 2, d0))
          if (luz) {
            const centro = P((x0 + x1) / 2, techo, (d0 + d1) / 2)
            const radio = Math.max(12, (W * FOCAL) / (d0 * NX) * 1.8)
            const halo = c.createRadialGradient(centro.x, centro.y, 1, centro.x, centro.y, radio)
            halo.addColorStop(0, e.panelesLuz ? 'rgba(255,255,255,.45)' : 'rgba(255,222,165,.28)')
            halo.addColorStop(1, 'rgba(255,255,255,0)')
            c.fillStyle = halo
            c.fillRect(centro.x - radio, centro.y - radio, radio * 2, radio * 2)
          }
        }
      }

      for (const lado of [-ancho, ancho]) {
        for (let j = 0; j < ND; j++) {
          for (let k = 0; k < NV; k++) {
            const d0 = dStep(j)
            const d1 = dStep(j + 1)
            const v0 = -1 + ((techo + 1) * k) / NV
            const v1 = -1 + ((techo + 1) * (k + 1)) / NV
            quad(P(lado, v1, d0), P(lado, v1, d1), P(lado, v0, d1), P(lado, v0, d0),
              color(e.paredLado, alt(e.paredLado), (j + k) % 2, d0))
          }
        }
      }
    }

    // piso a cuadros (hasta la repisa si el escenario tiene)
    const dPisoFin = e.repisa ? D_REPISA : D_FONDO
    for (let j = 0; j < ND; j++) {
      const d0 = dStep(j)
      const d1 = dStep(j + 1)
      if (d0 >= dPisoFin) break
      for (let i = 0; i < NX; i++) {
        const x0 = -ancho + (2 * ancho * i) / NX
        const x1 = -ancho + (2 * ancho * (i + 1)) / NX
        quad(P(x0, -1, d0), P(x1, -1, d0), P(x1, -1, d1), P(x0, -1, d1),
          color(e.piso1, e.piso2, (i + j) % 2, d0), e.lineasPiso)
      }
    }

    // repisa del fondo y bloques
    if (e.repisa) {
      const vTope = -0.38
      const caja = (x0, x1, v0, v1, d0, d1) => {
        quad(P(x0, v1, d0), P(x1, v1, d0), P(x1, v0, d0), P(x0, v0, d0), mezclar(e.repisa, e.niebla, nebl(d0)))
        quad(P(x0, v1, d1), P(x1, v1, d1), P(x1, v1, d0), P(x0, v1, d0), mezclar(e.repisaBorde, e.niebla, nebl(d0)))
      }
      caja(-ancho, ancho, -1, vTope, D_REPISA, D_FONDO)
      if (e.bloques) {
        caja(0.45, 0.72, vTope, -0.12, 3.08, 3.4)
        caja(0.76, 0.9, vTope, -0.22, 3.12, 3.36)
      }
    }

    if (e.ambiente === 'abierto-neon') {
      c.save()
      c.shadowColor = e.lineaBorde
      c.shadowBlur = 18
      c.strokeStyle = e.lineaBorde
      c.lineWidth = 4
      for (const lado of [-ancho, ancho]) {
        c.beginPath()
        for (let j = 0; j <= ND; j++) {
          const p = P(lado, -1, dStep(j))
          if (j === 0) c.moveTo(p.x, p.y)
          else c.lineTo(p.x, p.y)
        }
        c.stroke()
      }
      c.restore()
    } else if (e.id === 'atardecer') {
      const a = P(-1.5, -0.82, 2.45)
      const b = P(1.5, -0.82, 2.45)
      const cc = P(1.5, -0.82, 2.8)
      const d = P(-1.5, -0.82, 2.8)
      quad(a, b, cc, d, '#986372', e.lineaBorde)
    }

    tex.refresh()
    this.imagenSala = this.add.image(W / 2, H / 2, 'sala').setDepth(-10)
  }

  dibujarMira(p, delta) {
    const g = this.gMira
    this.marcaAcierto = Math.max(0, this.marcaAcierto - delta / 160)
    this.marcaFallo = Math.max(0, this.marcaFallo - delta / 220)
    g.clear()
    const trazos = trazosMira(this.cfgMira.estilo, this.cfgMira.escala * 1.2)
    const dibujar = (ancho, color, alfa) => {
      g.lineStyle(ancho, color, alfa)
      g.fillStyle(color, alfa)
      trazos.forEach((t) => {
        if (t.t === 'l') g.lineBetween(p.x + t.x1, p.y + t.y1, p.x + t.x2, p.y + t.y2)
        else if (t.relleno) g.fillCircle(p.x, p.y, t.r + (ancho > 2.5 ? 1 : 0))
        else g.strokeCircle(p.x, p.y, t.r)
      })
    }
    dibujar(4, 0x000000, 0.4)
    dibujar(2, this.cfgMira.color, 1)

    if (this.marcaAcierto > 0) {
      g.lineStyle(2.5, 0xffffff, this.marcaAcierto)
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        g.lineBetween(p.x + sx * 8, p.y + sy * 8, p.x + sx * 16, p.y + sy * 16)
      }
    }
    if (this.marcaFallo > 0) {
      g.lineStyle(2.5, 0xff526d, this.marcaFallo)
      for (const [sx, sy] of [[-1, -1], [1, -1]]) {
        g.lineBetween(p.x + sx * 7, p.y + sy * 7, p.x + sx * 16, p.y + sy * 16)
      }
    }
  }

  crearObjetivo() {
    // Solo el rng con semilla decide posiciones: asi todos ven lo mismo
    const x = this.rng.realInRange(-0.85, 0.85)
    const v = this.rng.realInRange(-0.15, 0.75)
    const d = this.rng.realInRange(1.6, 2.9)
    const prof = 2 + (D_FONDO - d)
    const esfera = this.add.image(0, 0, 'esfera').setDepth(prof).setScale(0)
    const sombra = this.add.ellipse(0, 0, 1, 1, 0x000000, 0.25).setDepth(1)
    const objetivo = {
      x,
      v,
      d,
      r: 0,
      esfera,
      sombra,
      creado: this.time.now,
      vida: null,
      apagado: null,
    }
    this.objetivos.push(objetivo)
    this.actualizarObjetivo(objetivo)
    objetivo.aparicion = this.tweens.add({
      targets: esfera,
      scale: (objetivo.r * 2) / 64,
      duration: 110,
      ease: 'Back.Out',
    })
    objetivo.apagado = this.tweens.add({
      targets: esfera,
      alpha: 0.45,
      duration: this.modo.vidaMs,
    })
    objetivo.vida = this.time.delayedCall(this.modo.vidaMs, () => {
      if (this.juegoTerminado) return
      this.quitarObjetivo(objetivo)
      this.fallar()
    })
  }

  actualizarObjetivo(objetivo) {
    const { width: W } = this.scale
    const p = this.proyectar(objetivo.x, objetivo.v, objetivo.d)
    const suelo = this.proyectar(objetivo.x, -1, objetivo.d)
    objetivo.xPantalla = p.x
    objetivo.yPantalla = p.y
    objetivo.r = 0.05 * (W / 2) * p.sc
    objetivo.esfera.setPosition(p.x, p.y)
    objetivo.sombra.setPosition(suelo.x, suelo.y).setSize(objetivo.r * 1.9, objetivo.r * 0.5)
  }

  quitarObjetivo(objetivo) {
    objetivo.vida?.remove(false)
    objetivo.apagado?.stop()
    this.objetivos = this.objetivos.filter((actual) => actual !== objetivo)
    objetivo.esfera.destroy()
    objetivo.sombra.destroy()
  }

  acertar(objetivo) {
    this.quitarObjetivo(objetivo)
    this.explotar(objetivo.xPantalla, objetivo.yPantalla, objetivo.r)
    this.aciertos++
    this.racha++
    this.mejorRacha = Math.max(this.mejorRacha, this.racha)
    this.reaccionTotal += Math.max(0, this.time.now - objetivo.creado)
    const multiplicador = 1 + Math.floor(this.racha / 5) * 0.25
    const puntos = Math.round(this.modo.puntos * multiplicador)
    this.puntaje += puntos
    this.marcaAcierto = 1
    this.marcaFallo = 0
    sonidos.acierto()
    this.textoFlotante(
      objetivo.xPantalla,
      objetivo.yPantalla - objetivo.r,
      `+${puntos}${multiplicador > 1 ? ` · x${multiplicador.toFixed(2)}` : ''}`
    )
    bus.emit(TARGET_HIT, {
      puntos,
      racha: this.racha,
      mejorRacha: this.mejorRacha,
      multiplicador,
      reaccionMs: Math.round(this.time.now - objetivo.creado),
    })
    bus.emit(COMBO_CHANGED, {
      racha: this.racha,
      mejorRacha: this.mejorRacha,
      multiplicador,
    })
  }

  fallar() {
    if (this.juegoTerminado) return
    this.fallos++
    this.racha = 0
    this.marcaFallo = 1
    sonidos.fallo()
    bus.emit(TARGET_MISSED, { racha: 0, mejorRacha: this.mejorRacha })
    bus.emit(COMBO_CHANGED, { racha: 0, mejorRacha: this.mejorRacha, multiplicador: 1 })
  }

  explotar(x, y, r) {
    const color = hexNum(this.escenario.particula)
    const anillo = this.add.circle(x, y, r, 0x000000, 0).setStrokeStyle(2, color, 1).setDepth(5)
    this.tweens.add({
      targets: anillo,
      scale: 2.6,
      alpha: 0,
      duration: 280,
      onComplete: () => anillo.destroy(),
    })
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 * i) / 8 + Phaser.Math.FloatBetween(-0.2, 0.2)
      const dist = Phaser.Math.Between(22, 48)
      const part = this.add.circle(x, y, Phaser.Math.Between(2, 4), color).setDepth(5)
      this.tweens.add({
        targets: part,
        x: x + Math.cos(a) * dist,
        y: y + Math.sin(a) * dist,
        alpha: 0,
        duration: 300,
        onComplete: () => part.destroy(),
      })
    }
  }

  textoFlotante(x, y, texto) {
    const t = this.add
      .text(x, y, texto, {
        fontFamily: 'Arial',
        fontStyle: 'bold',
        fontSize: '20px',
        color: this.escenario.particula,
      })
      .setOrigin(0.5)
      .setDepth(6)
    this.tweens.add({
      targets: t,
      y: y - 36,
      alpha: 0,
      duration: 650,
      onComplete: () => t.destroy(),
    })
  }

  agujero(x, y) {
    const g = this.add.graphics().setDepth(0)
    g.fillStyle(0x000000, 0.55)
    g.fillCircle(x, y, 3.5)
    g.lineStyle(1.5, 0x8a8f99, 0.7)
    g.strokeCircle(x, y, 5.5)
    this.tweens.add({
      targets: g,
      alpha: 0,
      delay: 2000,
      duration: 900,
      onComplete: () => g.destroy(),
    })
  }

  terminar() {
    if (this.juegoTerminado) return
    this.juegoTerminado = true
    this.partidaIniciada = false
    sonidos.final()
    this.time.removeAllEvents()
    this.tweens.killAll()
    this.children.removeAll(true)
    this.objetivos = []
    this.pistola = null
    this.gMira = null
    bus.emit(COUNTDOWN_CHANGED, { restante: 0 })
    bus.emit(TIME_UP, {
      puntaje: this.puntaje,
      aciertos: this.aciertos,
      fallos: this.fallos,
      disparos: this.disparos,
      precision: this.disparos ? Math.round((this.aciertos / this.disparos) * 100) : 0,
      reaccionPromedio: this.aciertos ? Math.round(this.reaccionTotal / this.aciertos) : 0,
      mejorRacha: this.mejorRacha,
    })
  }
}

