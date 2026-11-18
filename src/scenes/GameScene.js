import Phaser from 'phaser'
import modos from '../data/modos.json'
import Pistola from './Pistola.js'
import pistolaUrl from '../assets/pistola.png'
import { sonidos } from '../audio/sonidos.js'
import { bus } from '../events/bus.js'
import { TARGET_HIT, TARGET_MISSED, TIME_UP, TIME_CHANGED, SHOT_FIRED } from '../events/nombres.js'

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game')
  }

  preload() {
    this.load.image('pistola', pistolaUrl)
  }

  init(datos) {
    this.modo = modos.find((m) => m.id === datos.modoId) ?? modos[0]
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

    this.crearTexturas()
    this.dibujarSala()
    this.pistola = new Pistola(this)
    this.add.image(this.scale.width / 2, this.scale.height / 2, 'vineta').setDepth(30)
    this.mira = this.add.graphics().setDepth(40)

    this.input.on('pointerdown', (p, sobre) => {
      if (!this.pistola) return
      this.pistola.disparar()
      this.cameras.main.shake(50, 0.0025)
      sonidos.disparo()
      bus.emit(SHOT_FIRED)
      if (sobre.length === 0) this.agujero(p.x, p.y)
    })

    bus.emit(TIME_CHANGED, { segundos: this.restantes })

    // Cuenta regresiva: un tick por segundo
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

    // Aparicion de objetivos segun el modo (viene del JSON)
    this.time.addEvent({
      delay: this.modo.apareceCadaMs,
      loop: true,
      callback: () => this.crearObjetivo(),
    })
  }

  update(tiempo, delta) {
    const puntero = this.input.activePointer
    this.pistola?.actualizar(puntero, tiempo, delta)
    if (this.mira) this.dibujarMira(puntero, delta)
  }

  crearTexturas() {
    const { width: W, height: H } = this.scale

    const esf = this.textures.createCanvas('esfera', 64, 64)
    let c = esf.getContext()
    let g = c.createRadialGradient(24, 22, 4, 32, 32, 32)
    g.addColorStop(0, '#d6fcff')
    g.addColorStop(0.4, '#2ee6f0')
    g.addColorStop(1, '#0795a8')
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
    g.addColorStop(1, 'rgba(0,0,0,0.55)')
    c.fillStyle = g
    c.fillRect(0, 0, W, H)
    vin.refresh()
  }

  dibujarSala() {
    const { width: W, height: H } = this.scale
    const bx1 = W * 0.2
    const bx2 = W * 0.8
    const by1 = H * 0.18
    const by2 = H * 0.6
    this.sala = { bx1, bx2, by1, by2 }

    const g = this.add.graphics().setDepth(-10)
    const poly = (color, pts) => {
      g.fillStyle(color, 1)
      g.fillPoints(pts.map(([x, y]) => ({ x, y })), true)
    }

    g.fillStyle(0x2a2d33, 1)
    g.fillRect(0, 0, W, H)
    poly(0x4c505a, [[0, 0], [W, 0], [bx2, by1], [bx1, by1]])
    poly(0x30343b, [[0, 0], [bx1, by1], [bx1, by2], [0, H]])
    poly(0x30343b, [[W, 0], [bx2, by1], [bx2, by2], [W, H]])
    g.fillStyle(0x3a3e46, 1)
    g.fillRect(bx1, by1, bx2 - bx1, by2 - by1)
    g.fillStyle(0x4a4e58, 1)
    g.fillRect(bx1, by1 + (by2 - by1) * 0.55, bx2 - bx1, (by2 - by1) * 0.45)
    poly(0xd8d4c8, [[bx1, by2], [bx2, by2], [W, H], [0, H]])

    g.lineStyle(1, 0xa8a498, 0.8)
    for (let i = 0; i <= 8; i++) {
      g.lineBetween(bx1 + ((bx2 - bx1) * i) / 8, by2, (W * i) / 8, H)
    }
    for (const t of [0.12, 0.28, 0.5, 0.78]) {
      const y = by2 + (H - by2) * t
      g.lineBetween(bx1 * (1 - t), y, bx2 + (W - bx2) * t, y)
    }
  }

  dibujarMira(p, delta) {
    const g = this.mira
    this.marcaAcierto = Math.max(0, this.marcaAcierto - delta / 160)
    const trazos = [[-12, 0, -4, 0], [4, 0, 12, 0], [0, -12, 0, -4], [0, 4, 0, 12]]
    g.clear()
    g.lineStyle(4, 0x000000, 0.45)
    trazos.forEach(([a, b, c, d]) => g.lineBetween(p.x + a, p.y + b, p.x + c, p.y + d))
    g.lineStyle(2, 0xffffff, 1)
    trazos.forEach(([a, b, c, d]) => g.lineBetween(p.x + a, p.y + b, p.x + c, p.y + d))
    g.fillStyle(0x2ee6f0, 1)
    g.fillCircle(p.x, p.y, 1.8)

    // marcador de acierto (X blanca que se desvanece)
    if (this.marcaAcierto > 0) {
      g.lineStyle(2.5, 0xffffff, this.marcaAcierto)
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        g.lineBetween(p.x + sx * 8, p.y + sy * 8, p.x + sx * 15, p.y + sy * 15)
      }
    }
  }

  crearObjetivo() {
    const { width: W, height: H } = this.scale
    const { by1, by2 } = this.sala
    // Solo el rng con semilla decide posiciones: asi todos ven lo mismo
    const x = this.rng.between(50, W - 50)
    const y = this.rng.between(by1 + 14, by2 - 8)
    const t = (y - by1) / (by2 - by1)
    const r = 11 + t * 8
    const escala = (r * 2) / 64

    const sombra = this.add.ellipse(x, by2 + (H - by2) * 0.35, r * 1.8, r * 0.5, 0x000000, 0.22).setDepth(1)
    const esfera = this.add.image(x, y, 'esfera').setDepth(2).setScale(0)
    esfera.setInteractive(new Phaser.Geom.Circle(32, 32, 32), Phaser.Geom.Circle.Contains)

    this.tweens.add({ targets: esfera, scale: escala, duration: 110, ease: 'Back.Out' })
    const apagar = this.tweens.add({ targets: esfera, alpha: 0.4, duration: this.modo.vidaMs })

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
      this.explotar(x, y, r)
      quitar()
      this.aciertos++
      this.puntaje += this.modo.puntos
      this.marcaAcierto = 1
      sonidos.acierto()
      this.textoFlotante(x, y - r, '+' + this.modo.puntos)
      bus.emit(TARGET_HIT, { puntos: this.modo.puntos })
    })
  }

  explotar(x, y, r) {
    const anillo = this.add.circle(x, y, r, 0x000000, 0).setStrokeStyle(2, 0x7ff3f9, 1).setDepth(4)
    this.tweens.add({
      targets: anillo,
      scale: 2.6,
      alpha: 0,
      duration: 280,
      onComplete: () => anillo.destroy(),
    })
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 * i) / 8 + Phaser.Math.FloatBetween(-0.2, 0.2)
      const dist = Phaser.Math.Between(22, 42)
      const p = this.add.circle(x, y, Phaser.Math.Between(2, 4), 0x7ff3f9).setDepth(4)
      this.tweens.add({
        targets: p,
        x: x + Math.cos(a) * dist,
        y: y + Math.sin(a) * dist,
        alpha: 0,
        duration: 300,
        onComplete: () => p.destroy(),
      })
    }
  }

  textoFlotante(x, y, texto) {
    const t = this.add
      .text(x, y, texto, { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '18px', color: '#7ff3f9' })
      .setOrigin(0.5)
      .setDepth(6)
    this.tweens.add({
      targets: t,
      y: y - 34,
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
    this.mira = null
    bus.emit(TIME_UP, { puntaje: this.puntaje, aciertos: this.aciertos })
  }
}
