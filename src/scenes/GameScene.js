import Phaser from 'phaser'
import modos from '../data/modos.json'
import Pistola from './Pistola.js'
import pistolaUrl from '../assets/pistola.png'
import { bus } from '../events/bus.js'
import { TARGET_HIT, TARGET_MISSED, TIME_UP, TIME_CHANGED } from '../events/nombres.js'

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game')
  }

  preload() {
    this.load.image('pistola', pistolaUrl)
  }

  init(datos) {
    this.modo = modos.find((m) => m.id === datos.modoId) ?? modos[0]
    this.rng = datos.semilla != null ? new Phaser.Math.RandomDataGenerator([String(datos.semilla)]) : Phaser.Math.RND
  }

  create() {
    this.restantes = this.modo.duracionSeg
    this.puntaje = 0
    this.aciertos = 0

    this.dibujarSala()
    this.pistola = new Pistola(this)
    this.mira = this.add.graphics().setDepth(20)
    this.input.on('pointerdown', () => this.pistola?.disparar())

    bus.emit(TIME_CHANGED, { segundos: this.restantes })

    // Cuenta regresiva: un tick por segundo
    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        this.restantes--
        bus.emit(TIME_CHANGED, { segundos: this.restantes })
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

  update() {
    const puntero = this.input.activePointer
    this.pistola?.apuntar(puntero)
    if (this.mira) this.dibujarMira(puntero)
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

    // lineas del piso con perspectiva
    g.lineStyle(1, 0xa8a498, 0.8)
    for (let i = 0; i <= 8; i++) {
      g.lineBetween(bx1 + ((bx2 - bx1) * i) / 8, by2, (W * i) / 8, H)
    }
    for (const t of [0.12, 0.28, 0.5, 0.78]) {
      const y = by2 + (H - by2) * t
      g.lineBetween(bx1 * (1 - t), y, bx2 + (W - bx2) * t, y)
    }
  }

  dibujarMira(p) {
    const g = this.mira
    const trazos = [[-12, 0, -4, 0], [4, 0, 12, 0], [0, -12, 0, -4], [0, 4, 0, 12]]
    g.clear()
    g.lineStyle(4, 0x000000, 0.45)
    trazos.forEach(([a, b, c, d]) => g.lineBetween(p.x + a, p.y + b, p.x + c, p.y + d))
    g.lineStyle(2, 0xffffff, 1)
    trazos.forEach(([a, b, c, d]) => g.lineBetween(p.x + a, p.y + b, p.x + c, p.y + d))
    g.fillStyle(0x2ee6f0, 1)
    g.fillCircle(p.x, p.y, 1.8)
  }

  crearObjetivo() {
    const { width: W, height: H } = this.scale
    const { by1, by2 } = this.sala
    const x = this.rng.between(50, W - 50)
    const y = this.rng.between(by1 + 10, by2 - 6)

    const sombra = this.add.ellipse(x, by2 + (H - by2) * 0.35, 26, 7, 0x000000, 0.22).setDepth(1)
    const objetivo = this.add.circle(x, y, 16, 0x2ee6f0).setDepth(2)
    const brillo = this.add.circle(x - 5, y - 5, 5, 0xffffff, 0.55).setDepth(3)
    objetivo.setInteractive()

    const quitar = () => {
      objetivo.destroy()
      brillo.destroy()
      sombra.destroy()
    }

    const vida = this.time.delayedCall(this.modo.vidaMs, () => {
      quitar()
      bus.emit(TARGET_MISSED)
    })

    objetivo.once('pointerdown', () => {
      vida.remove(false)
      this.explotar(x, y)
      quitar()
      this.aciertos++
      this.puntaje += this.modo.puntos
      bus.emit(TARGET_HIT, { puntos: this.modo.puntos })
    })
  }

  explotar(x, y) {
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI * 2 * i) / 6
      const p = this.add.circle(x, y, 3, 0x7ff3f9).setDepth(4)
      this.tweens.add({
        targets: p,
        x: x + Math.cos(a) * 26,
        y: y + Math.sin(a) * 26,
        alpha: 0,
        duration: 260,
        onComplete: () => p.destroy(),
      })
    }
  }

  terminar() {
    this.time.removeAllEvents()
    this.tweens.killAll()
    this.children.removeAll(true)
    this.pistola = null
    this.mira = null
    bus.emit(TIME_UP, { puntaje: this.puntaje, aciertos: this.aciertos })
  }
}


