<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import Phaser from 'phaser'
import GameScene from '../scenes/GameScene.js'
import { bus } from '../events/bus.js'
import {
  TARGET_HIT, TARGET_MISSED, TIME_UP, TIME_CHANGED, SHOT_FIRED, SOUND_TOGGLED,
} from '../events/nombres.js'
import { useJuegoStore } from '../stores/juego.js'
import { useOnlineStore } from '../stores/online.js'

const props = defineProps({
  modoId: { type: String, default: 'rapido' },
  semilla: { type: Number, default: null },
  sala: { type: Object, default: null },
})
const emit = defineEmits(['terminado'])

const store = useJuegoStore()
const online = useOnlineStore()
const contenedor = ref(null)
const segundos = ref(0)
const fallos = ref(0)
const disparos = ref(0)
let juego = null

const precision = computed(() =>
  disparos.value ? Math.round((store.aciertos / disparos.value) * 100) : 0
)
const tiempoTexto = computed(() => {
  const s = Math.max(0, segundos.value)
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0')
})

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
    width: 640,
    height: 400,
    backgroundColor: '#20232A',
    scene: [],
  })
  juego.scene.add('Game', GameScene, true, { modoId: props.modoId, semilla: props.semilla })
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
  <div class="partida">
    <div v-if="sala" class="rivales">
      <span v-for="r in online.ranking" :key="r.id" :class="{ yo: r.id === online.jugador?.id }">
        {{ r.nombre }} <strong>{{ r.puntaje }}</strong>
      </span>
    </div>

    <div class="lienzo">
      <div ref="contenedor"></div>

      <div class="hud-aim">
        <div class="panel panel-izq">
          <small>PTS</small>
          <strong>{{ store.puntaje }}</strong>
        </div>
        <div class="reloj">
          <span class="flecha">&lsaquo;</span>
          <strong>{{ tiempoTexto }}</strong>
          <span class="flecha">&rsaquo;</span>
        </div>
        <div class="panel panel-der">
          <small>ACIERTOS</small>
          <strong>{{ store.aciertos }}</strong>
          <small class="pct">{{ precision }}%</small>
        </div>
      </div>

      <button class="sonido" :class="{ apagado: !store.sonido }" @click="alternarSonido">
        Sonido
      </button>
    </div>
  </div>
</template>
