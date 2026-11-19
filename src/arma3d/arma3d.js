import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { bus } from '../events/bus.js'
import { SHOT_FIRED } from '../events/nombres.js'

// Si pones un modelo .glb dentro de src/assets/arma/, se usa en lugar del arma de piezas.
const modelos = import.meta.glob('../assets/arma/*.glb', { eager: true, query: '?url', import: 'default' })

// Ajustes del modelo .glb (solo si usas uno)
const TAMANO_MODELO = 0.19
const ORIENTACION_MODELO = { x: 0, y: Math.PI, z: 0 } // radianes: gira el modelo si apunta para otro lado

// Posicion del arma frente a la camara
const BASE = { x: 0.1, y: -0.105, z: -0.34, ry: 0.1, rx: 0.06 }

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

const mat = (color, rug = 0.5, met = 0.2) =>
  new THREE.MeshStandardMaterial({ color, roughness: rug, metalness: met })

const caja = (w, h, l, material, x = 0, y = 0, z = 0) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), material)
  m.position.set(x, y, z)
  return m
}

const capsula = (radio, largo, material, x, y, z) => {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(radio, largo, 4, 10), material)
  m.position.set(x, y, z)
  return m
}

// Arma hecha de piezas. En su espacio: -z es adelante, +z es hacia la camara.
function construirArma() {
  const g = new THREE.Group()
  const metal = mat(0xb4b9c6, 0.4, 0.45)
  const rojo = mat(0xc0132f, 0.45, 0.25)
  const negro = mat(0x14161b, 0.6, 0.3)
  const guante = mat(0x2d3142, 0.85, 0.05)
  const placa = mat(0x4a5068, 0.65, 0.1)
  const punto = new THREE.MeshBasicMaterial({ color: 0xf2fff2 })

  // corredera (retrocede al disparar)
  const correderaZ = -0.02
  const corredera = new THREE.Group()
  corredera.position.set(0, 0.062, correderaZ)
  corredera.add(caja(0.034, 0.036, 0.21, metal))
  for (let i = 0; i < 5; i++) {
    corredera.add(caja(0.0364, 0.028, 0.004, negro, 0, -0.002, 0.062 + i * 0.012))
  }
  corredera.add(caja(0.011, 0.011, 0.012, negro, -0.011, 0.0235, 0.088))
  corredera.add(caja(0.011, 0.011, 0.012, negro, 0.011, 0.0235, 0.088))
  corredera.add(caja(0.004, 0.004, 0.002, punto, -0.011, 0.0245, 0.0945))
  corredera.add(caja(0.004, 0.004, 0.002, punto, 0.011, 0.0245, 0.0945))
  corredera.add(caja(0.007, 0.012, 0.012, negro, 0, 0.024, -0.09))
  corredera.add(caja(0.004, 0.004, 0.002, punto, 0, 0.0255, -0.0835))
  g.add(corredera)

  const canon = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.03, 12), negro)
  canon.rotation.x = Math.PI / 2
  canon.position.set(0, 0.058, -0.135)
  g.add(canon)

  // marco, empunadura y guardamonte
  g.add(caja(0.03, 0.028, 0.2, rojo, 0, 0.034, -0.015))
  const empunadura = caja(0.032, 0.095, 0.052, rojo, 0, -0.012, 0.085)
  empunadura.rotation.x = -0.22
  g.add(empunadura)
  g.add(caja(0.008, 0.03, 0.006, rojo, 0, 0.005, -0.03))
  g.add(caja(0.008, 0.006, 0.05, rojo, 0, -0.009, -0.005))

  // gatillo (se acciona al disparar)
  const gatillo = new THREE.Group()
  gatillo.position.set(0, 0.018, 0.012)
  gatillo.add(caja(0.007, 0.022, 0.007, negro, 0, -0.011, 0))
  g.add(gatillo)

  // mano con guante
  g.add(caja(0.052, 0.082, 0.05, guante, 0.012, -0.03, 0.115))
  g.add(caja(0.046, 0.012, 0.05, placa, 0.012, 0.015, 0.118))
  const alturas = [-0.034, -0.056, -0.078]
  alturas.forEach((y, i) => {
    const dedo = capsula(0.0095, 0.034, guante, -0.012, y, 0.048 - i * 0.006)
    dedo.rotation.z = Math.PI / 2
    g.add(dedo)
  })
  const pulgar = capsula(0.0105, 0.05, guante, -0.026, 0.02, 0.07)
  pulgar.rotation.x = Math.PI / 2
  g.add(pulgar)

  // antebrazo hacia la esquina inferior derecha
  const direccion = new THREE.Vector3(0.11, -0.18, 0.26).normalize()
  const antebrazo = capsula(0.034, 0.26, guante, 0.066, -0.118, 0.242)
  antebrazo.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direccion)
  g.add(antebrazo)

  return {
    grupo: g,
    corredera,
    correderaZ,
    gatillo,
    destello: new THREE.Vector3(0, 0.058, -0.15),
    casquillo: new THREE.Vector3(0.02, 0.07, 0.04),
  }
}

function construirGuante() {
  const g = new THREE.Group()
  const guante = mat(0x2d3142, 0.85, 0.05)
  const placa = mat(0x4a5068, 0.65, 0.1)

  g.add(caja(0.052, 0.082, 0.05, guante, 0.012, -0.03, 0.115))
  g.add(caja(0.046, 0.012, 0.05, placa, 0.012, 0.015, 0.118))
  const alturas = [-0.034, -0.056, -0.078]
  alturas.forEach((y, i) => {
    const dedo = capsula(0.0095, 0.034, guante, -0.012, y, 0.048 - i * 0.006)
    dedo.rotation.z = Math.PI / 2
    g.add(dedo)
  })

  const pulgar = capsula(0.0105, 0.05, guante, -0.026, 0.02, 0.07)
  pulgar.rotation.x = Math.PI / 2
  g.add(pulgar)

  const direccion = new THREE.Vector3(0.11, -0.18, 0.26).normalize()
  const antebrazo = capsula(0.034, 0.26, guante, 0.066, -0.118, 0.242)
  antebrazo.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direccion)
  g.add(antebrazo)
  return g
}

async function cargarModelo(url) {
  const gltf = await new GLTFLoader().loadAsync(url)
  const modelo = gltf.scene
  modelo.rotation.set(ORIENTACION_MODELO.x, ORIENTACION_MODELO.y, ORIENTACION_MODELO.z)
  const caja3 = new THREE.Box3().setFromObject(modelo)
  const tam = caja3.getSize(new THREE.Vector3())
  modelo.scale.setScalar(TAMANO_MODELO / Math.max(tam.x, tam.y, tam.z))
  caja3.setFromObject(modelo)
  modelo.position.sub(caja3.getCenter(new THREE.Vector3()))
  const envoltura = new THREE.Group()
  envoltura.add(modelo)
  const animador = new THREE.AnimationMixer(modelo)
  const clipDisparo = gltf.animations.find((clip) =>
    /shoot|dispar|shot|fire/i.test(clip.name)
  )
  const accionDisparo = clipDisparo ? animador.clipAction(clipDisparo) : null
  if (accionDisparo) accionDisparo.setLoop(THREE.LoopOnce, 1).clampWhenFinished = true
  return {
    grupo: envoltura,
    corredera: null,
    correderaZ: 0,
    gatillo: null,
    destello: new THREE.Vector3(0, 0.02, -0.14),
    casquillo: new THREE.Vector3(0.02, 0.03, 0.02),
    animador,
    accionDisparo,
  }
}

function crearDestello() {
  const lienzo = document.createElement('canvas')
  lienzo.width = 128
  lienzo.height = 128
  const c = lienzo.getContext('2d')
  const g = c.createRadialGradient(64, 64, 2, 64, 64, 64)
  g.addColorStop(0, 'rgba(255,247,194,1)')
  g.addColorStop(0.35, 'rgba(255,190,70,0.9)')
  g.addColorStop(1, 'rgba(255,120,20,0)')
  c.fillStyle = g
  c.fillRect(0, 0, 128, 128)
  const material = new THREE.MeshBasicMaterial({
    map: new THREE.CanvasTexture(lienzo),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const grupo = new THREE.Group()
  const plano = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.11), material)
  const luz = new THREE.PointLight(0xffb347, 0, 0.6, 2)
  grupo.add(plano)
  grupo.add(luz)
  grupo.visible = false
  return { grupo, plano, luz }
}

export function crearArma3D(contenedor) {
  const render = new THREE.WebGLRenderer({ alpha: true, antialias: true })
  render.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  render.setClearColor(0x000000, 0)
  const lienzo = render.domElement
  lienzo.style.width = '100%'
  lienzo.style.height = '100%'
  lienzo.style.display = 'block'
  contenedor.appendChild(lienzo)

  const escena = new THREE.Scene()
  const camara = new THREE.PerspectiveCamera(45, 16 / 9, 0.02, 5)

  escena.add(new THREE.HemisphereLight(0xdde6ff, 0x30333c, 1.3))
  const sol = new THREE.DirectionalLight(0xffffff, 2.6)
  sol.position.set(-0.5, 0.9, 0.7)
  escena.add(sol)
  const relleno = new THREE.DirectionalLight(0x7aa2ff, 0.9)
  relleno.position.set(0.8, 0.2, 0.3)
  escena.add(relleno)

  const pivote = new THREE.Group()
  pivote.rotation.order = 'YXZ'
  pivote.position.set(BASE.x, BASE.y, BASE.z)
  pivote.rotation.set(BASE.rx, BASE.ry, 0)
  escena.add(pivote)

  let actual = construirArma()
  pivote.add(actual.grupo)

  const destello = crearDestello()
  destello.grupo.position.copy(actual.destello)
  pivote.add(destello.grupo)

  // casquillo expulsado (vive en el mundo, no sigue al arma)
  const casquillo = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.004, 0.012), mat(0xd9a441, 0.35, 0.9))
  casquillo.visible = false
  escena.add(casquillo)
  const velCas = new THREE.Vector3()
  let tCas = 0

  const ajustar = () => {
    const w = contenedor.clientWidth || 1
    const h = contenedor.clientHeight || 1
    render.setSize(w, h, false)
    camara.aspect = w / h
    camara.updateProjectionMatrix()
  }
  const observador = new ResizeObserver(ajustar)
  observador.observe(contenedor)
  ajustar()

  const raton = { x: 0, y: 0, ox: 0, oy: 0 }
  const alMover = (ev) => {
    const r = contenedor.getBoundingClientRect()
    raton.x = clamp(((ev.clientX - r.left) / r.width) * 2 - 1, -1, 1)
    raton.y = clamp(((ev.clientY - r.top) / r.height) * 2 - 1, -1, 1)
  }
  window.addEventListener('pointermove', alMover)

  let retroceso = 0
  let correderaR = 0
  let tDestello = 0
  const sway = { x: 0, y: 0 }

  const alDisparar = () => {
    retroceso = 1
    correderaR = 1
    if (actual.accionDisparo) {
      actual.accionDisparo.stop()
      actual.accionDisparo.play()
    }
    tDestello = 0.06
    destello.plano.rotation.z = Math.random() * Math.PI * 2
    destello.plano.scale.setScalar(0.7 + Math.random() * 0.6)
    pivote.updateMatrixWorld(true)
    const p = actual.casquillo.clone()
    actual.grupo.localToWorld(p)
    casquillo.position.copy(p)
    velCas.set(0.25 + Math.random() * 0.15, 0.25 + Math.random() * 0.1, 0.15 + Math.random() * 0.1)
    tCas = 0.9
  }
  bus.on(SHOT_FIRED, alDisparar)

  // Si hay un modelo .glb en src/assets/arma/, reemplaza al arma de piezas
  let vivo = true
  const url = Object.values(modelos)[0]
  let guante = null
  if (url) {
    cargarModelo(url)
      .then((m) => {
        if (!vivo) return
        pivote.remove(actual.grupo)
        actual = m
        pivote.add(actual.grupo)
        guante = construirGuante()
        pivote.add(guante)
        destello.grupo.position.copy(actual.destello)
      })
      .catch(() => {})
  }

  let ultimo = performance.now()
  const bucle = (ahora) => {
    if (!vivo) return
    requestAnimationFrame(bucle)
    const dt = Math.min(0.05, (ahora - ultimo) / 1000)
    ultimo = ahora
    actual.animador?.update(dt)

    // inercia: el arma se retrasa respecto al movimiento del mouse
    const vx = raton.x - raton.ox
    const vy = raton.y - raton.oy
    raton.ox = raton.x
    raton.oy = raton.y
    sway.x = clamp(sway.x - vx * 0.35, -0.12, 0.12)
    sway.y = clamp(sway.y - vy * 0.25, -0.08, 0.08)
    const k = 1 - Math.pow(0.002, dt)
    sway.x -= sway.x * k
    sway.y -= sway.y * k

    retroceso = Math.max(0, retroceso - dt / 0.16)
    correderaR = Math.max(0, correderaR - dt / 0.09)

    const t = ahora / 1000
    const objX = BASE.x + raton.x * 0.035 + sway.x * 0.25 + Math.cos(t * 1.6) * 0.0015
    const objY = BASE.y - raton.y * 0.018 + sway.y * 0.2 + Math.sin(t * 2.1) * 0.002
    const objZ = BASE.z + retroceso * 0.05
    const objRY = BASE.ry - raton.x * 0.2 - sway.x * 0.6
    const objRX = BASE.rx - raton.y * 0.12 + retroceso * 0.14 - sway.y * 0.5

    const s = 1 - Math.pow(1e-6, dt)
    pivote.position.x += (objX - pivote.position.x) * s
    pivote.position.y += (objY - pivote.position.y) * s
    pivote.position.z += (objZ - pivote.position.z) * s
    pivote.rotation.y += (objRY - pivote.rotation.y) * s
    pivote.rotation.x += (objRX - pivote.rotation.x) * s

    if (actual.corredera) actual.corredera.position.z = actual.correderaZ + correderaR * 0.05
    if (actual.gatillo) actual.gatillo.rotation.x = -0.5 * correderaR

    tDestello -= dt
    const encendido = tDestello > 0
    destello.grupo.visible = encendido
    destello.luz.intensity = encendido ? 0.035 : 0

    if (tCas > 0) {
      tCas -= dt
      velCas.y -= 2 * dt
      casquillo.position.addScaledVector(velCas, dt)
      casquillo.rotation.x += 12 * dt
      casquillo.rotation.z += 9 * dt
      casquillo.visible = tCas > 0
    }

    render.render(escena, camara)
  }
  requestAnimationFrame(bucle)

  return {
    destruir() {
      vivo = false
      bus.off(SHOT_FIRED, alDisparar)
      window.removeEventListener('pointermove', alMover)
      observador.disconnect()
      render.dispose()
      if (render.forceContextLoss) render.forceContextLoss()
      lienzo.remove()
    },
  }
}
