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

// Pistola en primera persona usando una imagen PNG (src/assets/pistola.png)
export default class Pistola {
  constructor(escena) {
    const { width, height } = escena.scale
    this.escena = escena
    this.base = { x: width * 0.64, y: height + 8 }

    quitarFondo(escena, 'pistola', 'pistolaLimpia')

    const imagen = escena.add.image(0, 0, 'pistolaLimpia').setOrigin(0.5, 1)
    const escala = (height * 0.56) / imagen.height
    imagen.setScale(escala)

    // Zona de la mira de la pistola dentro de la imagen (ajustable)
    const puntaX = (255 - imagen.width / 2) * escala
    const puntaY = -(imagen.height - 70) * escala

    this.destelloGrande = escena.add.circle(puntaX, puntaY, 22, 0xff9f43, 0.35).setVisible(false)
    this.destello = escena.add.circle(puntaX, puntaY, 12, 0xffe08a, 0.95).setVisible(false)

    this.cont = escena.add.container(this.base.x, this.base.y, [imagen, this.destelloGrande, this.destello])
    this.cont.setDepth(10)
  }

  apuntar(puntero) {
    const dx = puntero.x - this.base.x
    const dy = puntero.y - this.base.y
    const giro = Phaser.Math.Clamp(Math.atan2(dx, -dy) * 0.25, -0.1, 0.1)
    this.cont.rotation += (giro - this.cont.rotation) * 0.25
  }

  disparar() {
    if (!this.destello.active) return
    this.destello.setVisible(true)
    this.destelloGrande.setVisible(true)
    this.escena.time.delayedCall(60, () => {
      if (this.destello.active) {
        this.destello.setVisible(false)
        this.destelloGrande.setVisible(false)
      }
    })
    this.escena.tweens.add({
      targets: this.cont,
      y: this.base.y + 12,
      duration: 45,
      yoyo: true,
    })
  }
}
