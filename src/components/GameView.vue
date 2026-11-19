<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import Phaser from 'phaser'
import GameScene from '../scenes/GameScene.js'
import Arma3DView from './Arma3DView.vue'
import modos from '../data/modos.json'
import { bus } from '../events/bus.js'
import {
  TARGET_HIT, TARGET_MISSED, TIME_UP, TIME_CHANGED, SHOT_FIRED, SOUND_TOGGLED,
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
let juego = null

const duracion = computed(() => modos.find((m) => m.id === props.modoId)?.duracionSeg ?? 30)
const progreso = computed(() =>
  Math.max(0, Math.min(100, (segundos.value / duracion.value) * 100))
)
const precision = computed(() =>
  disparos.value ? Math.round((store.aciertos / disparos.value) * 100) : 0
)
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
}

const alAcertar = ({ puntos }) => {
  store.sumarAcierto(puntos)
  props.sala?.enviarPuntaje(store.puntaje)
}
const alFallar = () => { fallos.value++ }
const alDisparar = () => { disparos.value++ }
const alCambiarTiempo = (datos) => { segundos.value = datos.segundos }
const alTerminar = () => {
  props.sala?.terminar(store.puntaje)
  emit('terminado', {
    puntaje: store.puntaje,
    aciertos: store.aciertos,
    fallos: fallos.value,
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

  juego = new Phaser.Game({
    type: Phaser.AUTO,
    parent: contenedor.value,
    width: 1280,
    height: 720,
    backgroundColor: '#20232A',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [],
  })
  juego.scene.add('Game', GameScene, true, {
    modoId: props.modoId,
    semilla: props.semilla,
    escenarioId: ajustes.escenario,
    miraEstilo: ajustes.miraEstilo,
    miraColor: ajustes.miraColor,
    miraEscala: ajustes.miraEscala,
  })
})

onBeforeUnmount(() => {
  bus.off(TARGET_HIT, alAcertar)
  bus.off(TARGET_MISSED, alFallar)
  bus.off(SHOT_FIRED, alDisparar)
  bus.off(TIME_CHANGED, alCambiarTiempo)
  bus.off(TIME_UP, alTerminar)
  if (juego) juego.destroy(true)
})
</script>

<template>
  <div ref="raiz" class="partida">
    <div v-if="sala" class="rivales">
      <span v-for="r in online.ranking" :key="r.id" :class="{ yo: r.id === online.jugador?.id }">
        {{ r.nombre }} <strong>{{ r.puntaje }}</strong>
      </span>
    </div>

    <div class="lienzo">
      <div ref="contenedor" class="juego"></div>
      <Arma3DView />

      <div class="hud2">
        <div class="barra"><i :style="{ width: progreso + '%' }"></i></div>
        <div class="datos">
          <div class="caja"><small>Puntos</small><strong>{{ store.puntaje }}</strong></div>
          <div class="caja"><small>Tiempo</small><strong>{{ tiempoTexto }}</strong></div>
          <div class="caja">
            <small>Precisi&oacute;n</small>
            <strong>{{ precision }}%</strong>
          </div>
        </div>
      </div>

      <button class="sonido" :class="{ apagado: !store.sonido }" @click="alternarSonido">
        Sonido
      </button>
      <button class="sonido completa" @click="pantallaCompleta">Pantalla completa</button>
    </div>
  </div>
</template>


