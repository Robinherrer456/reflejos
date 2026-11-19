<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import Phaser from 'phaser'
import GameScene from '../scenes/GameScene.js'
import Arma3DView from './Arma3DView.vue'
import modos from '../data/modos.json'
import { desbloquearSonido } from '../audio/sonidos.js'
import { bus } from '../events/bus.js'
import {
  TARGET_HIT,
  TARGET_MISSED,
  TIME_UP,
  TIME_CHANGED,
  SHOT_FIRED,
  SOUND_TOGGLED,
  COMBO_CHANGED,
  COUNTDOWN_CHANGED,
} from '../events/nombres.js'
import { useJuegoStore } from '../stores/juego.js'
import { useOnlineStore } from '../stores/online.js'
import { useAjustesStore } from '../stores/ajustes.js'

const props = defineProps({
  modoId: { type: String, default: 'rapido' },
  semilla: { type: Number, default: null },
  sala: { type: Object, default: null },
})
const emit = defineEmits(['terminado'])

const store = useJuegoStore()
const online = useOnlineStore()
const ajustes = useAjustesStore()
const contenedor = ref(null)
const segundos = ref(0)
const fallos = ref(0)
const disparos = ref(0)
const racha = ref(0)
const mejorRacha = ref(0)
const multiplicador = ref(1)
const cuentaAtras = ref(3)
let juego = null

const precision = computed(() =>
  disparos.value ? Math.round((store.aciertos / disparos.value) * 100) : 0
)
const avanceRacha = computed(() => (racha.value ? (((racha.value - 1) % 5) + 1) * 20 : 0))
const dos = (n) => String(n).padStart(2, '0')
const tiempoTexto = computed(() => {
  const s = Math.max(0, segundos.value)
  return dos(Math.floor(s / 60)) + ':' + dos(s % 60)
})

const raiz = ref(null)
function pantallaCompleta() {
  if (document.fullscreenElement) document.exitFullscreen()
  else raiz.value?.requestFullscreen?.()
}

function alternarSonido() {
  store.alternarSonido()
  bus.emit(SOUND_TOGGLED, { activo: store.sonido })
  if (store.sonido) desbloquearSonido()
}

function habilitarAudioEnInteraccion() {
  if (store.sonido) desbloquearSonido()
}

const alAcertar = ({ puntos }) => {
  store.sumarAcierto(puntos)
  props.sala?.enviarPuntaje(store.puntaje)
}
const alFallar = () => { fallos.value++ }
const alDisparar = () => { disparos.value++ }
const alCambiarTiempo = (datos) => { segundos.value = datos.segundos }
const alCambiarRacha = (datos) => {
  racha.value = datos.racha
  mejorRacha.value = datos.mejorRacha
  multiplicador.value = datos.multiplicador
}
const alCuentaAtras = ({ restante }) => { cuentaAtras.value = restante || null }
const alTerminar = (datos) => {
  props.sala?.terminar(store.puntaje)
  const resultado = { ...datos, puntaje: store.puntaje, aciertos: store.aciertos, fallos: fallos.value }
  const puestoRecord =
    resultado.puntaje > 0
      ? store.guardarRecord('Jugador', resultado.puntaje, {
          precision: resultado.precision,
          reaccionPromedio: resultado.reaccionPromedio,
          mejorRacha: resultado.mejorRacha,
        })
      : null
  emit('terminado', {
    ...resultado,
    recordGuardado: puestoRecord !== null,
    recordId: puestoRecord !== null ? store.ultimoRecordId : null,
  })
}

onMounted(() => {
  store.cargarRecords()
  store.reiniciar()
  bus.emit(SOUND_TOGGLED, { activo: store.sonido })
  bus.on(TARGET_HIT, alAcertar)
  bus.on(TARGET_MISSED, alFallar)
  bus.on(SHOT_FIRED, alDisparar)
  bus.on(TIME_CHANGED, alCambiarTiempo)
  bus.on(TIME_UP, alTerminar)
  bus.on(COMBO_CHANGED, alCambiarRacha)
  bus.on(COUNTDOWN_CHANGED, alCuentaAtras)

  juego = new Phaser.Game({
    type: Phaser.AUTO,
    parent: contenedor.value,
    width: contenedor.value.clientWidth || window.innerWidth,
    height: contenedor.value.clientHeight || window.innerHeight,
    backgroundColor: '#20232A',
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [],
  })
  juego.scene.add('Game', GameScene, true, {
    modoId: props.modoId,
    semilla: props.semilla,
    escenarioId: ajustes.escenario,
    miraEstilo: ajustes.miraEstilo,
    miraColor: ajustes.miraColor,
    miraEscala: ajustes.miraEscala,
    sensibilidad: ajustes.sensibilidad,
    campoVision: ajustes.campoVision,
  })
})

onBeforeUnmount(() => {
  bus.off(TARGET_HIT, alAcertar)
  bus.off(TARGET_MISSED, alFallar)
  bus.off(SHOT_FIRED, alDisparar)
  bus.off(TIME_CHANGED, alCambiarTiempo)
  bus.off(TIME_UP, alTerminar)
  bus.off(COMBO_CHANGED, alCambiarRacha)
  bus.off(COUNTDOWN_CHANGED, alCuentaAtras)
  if (juego) juego.destroy(true)
})
</script>

<template>
  <div ref="raiz" class="partida" @pointerdown.capture="habilitarAudioEnInteraccion">
    <div v-if="sala" class="rivales">
      <span v-for="r in online.ranking" :key="r.id" :class="{ yo: r.id === online.jugador?.id }">
        {{ r.nombre }} <strong>{{ r.puntaje }}</strong>
      </span>
    </div>

    <div class="lienzo">
      <div ref="contenedor" class="juego"></div>
      <Arma3DView v-if="ajustes.mostrarArma" />

      <div class="hud2">
        <div class="barra">
          <small>Racha {{ racha }} &middot; x{{ multiplicador.toFixed(2) }}</small>
          <i :style="{ width: avanceRacha + '%' }"></i>
        </div>
        <div class="datos">
          <div class="caja"><small>Puntos</small><strong>{{ store.puntaje }}</strong></div>
          <div class="caja"><small>Tiempo</small><strong>{{ tiempoTexto }}</strong></div>
          <div class="caja">
            <small>Precisi&oacute;n</small>
            <strong>{{ precision }}%</strong>
          </div>
        </div>
      </div>

      <div v-if="cuentaAtras" class="cuenta-atras" role="status" aria-live="assertive">
        {{ cuentaAtras }}
      </div>
      <button
        class="sonido"
        :class="{ apagado: !store.sonido }"
        :aria-pressed="store.sonido"
        @click="alternarSonido"
      >
        {{ store.sonido ? 'Sonido activado' : 'Activar sonido' }}
      </button>
      <button class="sonido completa" @click="pantallaCompleta">Pantalla completa</button>
    </div>
  </div>
</template>


