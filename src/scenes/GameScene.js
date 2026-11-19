import Phaser from 'phaser'
import modos from '../data/modos.json'
import escenarios from '../data/escenarios.json'
import { trazosMira } from '../utils/mira.js'
import Pistola from './Pistola.js'
import reposoUrl from '../assets/arma/arma-reposo.png'
import disparoUrl from '../assets/arma/arma-disparo.png'
import { sonidos, precargar } from '../audio/sonidos.js'
import { bus } from '../events/bus.js'
import { TARGET_HIT, TARGET_MISSED, TIME_UP, TIME_CHANGED, SHOT_FIRED } from '../events/nombres.js'

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
    this.marcaAcierto = 0

    precargar()
    this.crearTexturas()
    this.dibujarSala()
    this.pistola = new Pistola(this)
    this.add.image(this.scale.width / 2, this.scale.height / 2, 'vineta').setDepth(30)
    this.gMira = this.add.graphics().setDepth(40)

    this.input.on('pointerdown', (p, sobre) => {
      if (!this.pistola) return
      this.pistola.disparar()
      this.cameras.main.shake(50, 0.0025)
      bus.emit(SHOT_FIRED)
      if (sobre.length === 0) this.agujero(p.x, p.y)
    })

    bus.emit(TIME_CHANGED, { segundos: this.restantes })

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
    if (this.gMira) this.dibujarMira(puntero, delta)
  }

  // Proyeccion en perspectiva: (x, v, d) del espacio 3D a pixeles de pantalla
  proyectar(x, v, d) {
    const { width: W, height: H } = this.scale
    const sc = FOCAL / d
    return { x: W / 2 + x * (W / 2) * sc, y: H * 0.47 - v * (H / 2) * sc, sc }
  }

  crearTexturas() {
    const { width: W, height: H } = this.scale
    const e = this.escenario

    const esf = this.textures.createCanvas('esfera', 64, 64)
    let c = esf.getContext()
    let g = c.createRadialGradient(24, 22, 4, 32, 32, 32)
    g.addColorStop(0, e.esfera[0])
    g.addColorStop(0.4, e.esfera[1])
    g.addColorStop(1, e.esfera[2])
    c.fillStyle = g
    c.beginPath()
    c.arc(32, 32, 31, 0, Math.PI * 2)
    c.fill()
    esf.refresh()

    const des = this.textures.createCanvas('destello', 128, 128)
    c = des.getContext()
    g = c.createRadialGradient(64, 64, 2, 64, 64, 64)
    g.addColorStop(0, 'rgba(255,247,194,1)')
    g.addColorStop(0.35, 'rgba(255,190,70,0.9)')
    g.addColorStop(1, 'rgba(255,120,20,0)')
    c.fillStyle = g
    c.fillRect(0, 0, 128, 128)
    des.refresh()

    const vin = this.textures.createCanvas('vineta', W, H)
    c = vin.getContext()
    g = c.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.9)
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(1, 'rgba(0,0,0,' + e.vineta + ')')
    c.fillStyle = g
    c.fillRect(0, 0, W, H)
    vin.refresh()
  }

  // La sala se dibuja desde escenarios.json con perspectiva real y neblina por distancia
  dibujarSala() {
    const { width: W, height: H } = this.scale
    const e = this.escenario
    const tex = this.textures.createCanvas('sala', W, H)
    const c = tex.getContext()
    const P = (x, v, d) => this.proyectar(x, v, d)
    const nebl = (d) => ((d - D_CERCA) / (D_FONDO - D_CERCA)) * e.nieblaFuerza

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
        c.lineWidth = 1
        c.stroke()
      }
    }

    c.fillStyle = e.fondo
    c.fillRect(0, 0, W, H)

    const NX = 10
    const ND = 14
    const NV = 8
    const dStep = (j) => D_CERCA + ((D_FONDO - D_CERCA) * j) / ND
    const color = (base, alt, par, d) => mezclar(par ? base : alt, e.niebla, nebl(d))
    const alt = (base) => mezclar(base, e.contraste, 0.07)

    // pared del fondo
    for (let i = 0; i < NX; i++) {
      for (let k = 0; k < NV; k++) {
        const x0 = -1 + (2 * i) / NX
        const x1 = -1 + (2 * (i + 1)) / NX
        const v0 = -1 + (2 * k) / NV
        const v1 = -1 + (2 * (k + 1)) / NV
        quad(P(x0, v1, D_FONDO), P(x1, v1, D_FONDO), P(x1, v0, D_FONDO), P(x0, v0, D_FONDO),
          color(e.paredFondo, alt(e.paredFondo), (i + k) % 2, D_FONDO))
      }
    }

    // techo, con algunas luces
    for (let j = 0; j < ND; j++) {
      for (let i = 0; i < NX; i++) {
        const d0 = dStep(j)
        const d1 = dStep(j + 1)
        const x0 = -1 + (2 * i) / NX
        const x1 = -1 + (2 * (i + 1)) / NX
        const luz = i % 3 === 1 && j % 4 === 2
        const base = luz ? mezclar(e.techo, '#ffffff', 0.25) : e.techo
        quad(P(x0, 1, d0), P(x1, 1, d0), P(x1, 1, d1), P(x0, 1, d1),
          color(base, alt(base), (i + j) % 2, d0))
      }
    }

    // paredes laterales
    for (const lado of [-1, 1]) {
      for (let j = 0; j < ND; j++) {
        for (let k = 0; k < NV; k++) {
          const d0 = dStep(j)
          const d1 = dStep(j + 1)
          const v0 = -1 + (2 * k) / NV
          const v1 = -1 + (2 * (k + 1)) / NV
          quad(P(lado, v1, d0), P(lado, v1, d1), P(lado, v0, d1), P(lado, v0, d0),
            color(e.paredLado, alt(e.paredLado), (j + k) % 2, d0))
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
        const x0 = -1 + (2 * i) / NX
        const x1 = -1 + (2 * (i + 1)) / NX
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
      caja(-1, 1, -1, vTope, D_REPISA, D_FONDO)
      if (e.bloques) {
        caja(0.45, 0.72, vTope, -0.12, 3.08, 3.4)
        caja(0.76, 0.9, vTope, -0.22, 3.12, 3.36)
      }
    }

    tex.refresh()
    this.add.image(W / 2, H / 2, 'sala').setDepth(-10)
  }

  dibujarMira(p, delta) {
    const g = this.gMira
    this.marcaAcierto = Math.max(0, this.marcaAcierto - delta / 160)
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
  }

  crearObjetivo() {
    const W = this.scale.width
    // Solo el rng con semilla decide posiciones: asi todos ven lo mismo
    const x = this.rng.realInRange(-0.85, 0.85)
    const v = this.rng.realInRange(-0.15, 0.75)
    const d = this.rng.realInRange(1.6, 2.9)

    const p = this.proyectar(x, v, d)
    const suelo = this.proyectar(x, -1, d)
    const r = 0.05 * (W / 2) * p.sc
    const escala = (r * 2) / 64
    const prof = 2 + (D_FONDO - d)

    const sombra = this.add.ellipse(suelo.x, suelo.y, r * 1.9, r * 0.5, 0x000000, 0.25).setDepth(1)
    const esfera = this.add.image(p.x, p.y, 'esfera').setDepth(prof).setScale(0)
    esfera.setInteractive(new Phaser.Geom.Circle(32, 32, 32), Phaser.Geom.Circle.Contains)

    this.tweens.add({ targets: esfera, scale: escala, duration: 110, ease: 'Back.Out' })
    const apagar = this.tweens.add({ targets: esfera, alpha: 0.45, duration: this.modo.vidaMs })

    const quitar = () => {
      apagar.stop()
      esfera.destroy()
      sombra.destroy()
    }

    const vida = this.time.delayedCall(this.modo.vidaMs, () => {
      sonidos.fallo()
      quitar()
      bus.emit(TARGET_MISSED)
    })

    esfera.once('pointerdown', () => {
      vida.remove(false)
      this.explotar(p.x, p.y, r)
      quitar()
      this.aciertos++
      this.puntaje += this.modo.puntos
      this.marcaAcierto = 1
      sonidos.acierto()
      this.textoFlotante(p.x, p.y - r, '+' + this.modo.puntos)
      bus.emit(TARGET_HIT, { puntos: this.modo.puntos })
    })
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
    sonidos.final()
    this.time.removeAllEvents()
    this.tweens.killAll()
    this.children.removeAll(true)
    this.pistola = null
    this.gMira = null
    bus.emit(TIME_UP, { puntaje: this.puntaje, aciertos: this.aciertos })
  }
}

