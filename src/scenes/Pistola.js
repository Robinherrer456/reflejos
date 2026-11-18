import Phaser from 'phaser'

// Borra el fondo claro conectado a los bordes de la imagen (flood fill desde el borde)
function quitarFondo(escena, claveOrigen, claveNueva, tolerancia = 225) {
  const origen = escena.textures.get(claveOrigen).getSourceImage()
  const w = origen.width
  const h = origen.height
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(origen, 0, 0)
  const img = ctx.getImageData(0, 0, w, h)
  const d = img.data

  const esFondo = (p) => {
    const i = p * 4
    return d[i + 3] < 10 || (d[i] > tolerancia && d[i + 1] > tolerancia && d[i + 2] > tolerancia)
  }

  const visitado = new Uint8Array(w * h)
  const pila = []
  const meter = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return
    const p = y * w + x
    if (visitado[p] || !esFondo(p)) return
    visitado[p] = 1
    pila.push(p)
  }

  for (let x = 0; x < w; x++) { meter(x, 0); meter(x, h - 1) }
  for (let y = 0; y < h; y++) { meter(0, y); meter(w - 1, y) }

  while (pila.length) {
    const p = pila.pop()
    d[p * 4 + 3] = 0
    const x = p % w
    const y = (p - x) / w
    meter(x + 1, y); meter(x - 1, y); meter(x, y + 1); meter(x, y - 1)
  }

  ctx.putImageData(img, 0, 0)
  escena.textures.addCanvas(claveNueva, canvas)
}

// Arma en primera persona: inercia, respiracion y retroceso (como un viewmodel de CS)
export default class Pistola {
  constructor(escena) {
    const { width, height } = escena.scale
    this.escena = escena
    this.base = { x: width * 0.66, y: height + 8 }
    this.centro = { x: width / 2, y: height / 2 }

    quitarFondo(escena, 'pistola', 'pistolaLimpia')

    this.imagen = escena.add.image(0, 0, 'pistolaLimpia').setOrigin(0.5, 1)
    const escala = (height * 0.56) / this.imagen.height
    this.imagen.setScale(escala)

    // Zona de la punta del canon dentro de la imagen (ajustable)
    const puntaX = (255 - this.imagen.width / 2) * escala
    const puntaY = -(this.imagen.height - 70) * escala

    this.destello = escena.add
      .image(puntaX, puntaY, 'destello')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setVisible(false)

    this.cont = escena.add.container(this.base.x, this.base.y, [this.imagen, this.destello])
    this.cont.setDepth(10)

    this.sway = { x: 0, y: 0 }
    this.ultimo = { x: this.centro.x, y: this.centro.y }
    this.retroceso = 0
  }

  actualizar(p, tiempo, delta) {
    const nx = Phaser.Math.Clamp((p.x - this.centro.x) / this.centro.x, -1, 1)
    const ny = Phaser.Math.Clamp((p.y - this.centro.y) / this.centro.y, -1, 1)

    // inercia: el arma se retrasa respecto al movimiento del mouse
    const vx = p.x - this.ultimo.x
    const vy = p.y - this.ultimo.y
    this.ultimo.x = p.x
    this.ultimo.y = p.y
    this.sway.x = Phaser.Math.Clamp(this.sway.x - vx * 0.6, -40, 40)
    this.sway.y = Phaser.Math.Clamp(this.sway.y - vy * 0.4, -25, 25)
    const k = 1 - Math.pow(0.0005, delta / 1000)
    this.sway.x -= this.sway.x * k
    this.sway.y -= this.sway.y * k

    this.retroceso = Math.max(0, this.retroceso - delta / 140)

    // respiracion
    const bobX = Math.cos(tiempo * 0.0016) * 2
    const bobY = Math.sin(tiempo * 0.0021) * 3

    const objX = this.base.x + nx * 26 + this.sway.x + bobX
    const objY = this.base.y + ny * 8 + this.sway.y + bobY + this.retroceso * 24
    const objRot = nx * 0.09 + this.sway.x * 0.004 - this.retroceso * 0.05

    this.cont.x += (objX - this.cont.x) * 0.35
    this.cont.y += (objY - this.cont.y) * 0.35
    this.cont.rotation += (objRot - this.cont.rotation) * 0.3
    this.cont.setScale(1 - this.retroceso * 0.03)
  }

  disparar() {
    this.retroceso = 1
    this.destello
      .setVisible(true)
      .setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2))
      .setScale(Phaser.Math.FloatBetween(0.35, 0.55))
    this.escena.time.delayedCall(55, () => {
      if (this.destello.active) this.destello.setVisible(false)
    })
  }
}
