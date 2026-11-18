<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import Phaser from 'phaser'
import GameScene from '../scenes/GameScene.js'
import { bus } from '../events/bus.js'
import { TARGET_HIT, TARGET_MISSED, TIME_UP, TIME_CHANGED } from '../events/nombres.js'
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
let juego = null

const alAcertar = ({ puntos }) => {
  store.sumarAcierto(puntos)
  props.sala?.enviarPuntaje(store.puntaje)
}
const alFallar = () => { fallos.value++ }
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
  bus.on(TARGET_HIT, alAcertar)
  bus.on(TARGET_MISSED, alFallar)
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
  bus.off(TIME_CHANGED, alCambiarTiempo)
  bus.off(TIME_UP, alTerminar)
  if (juego) juego.destroy(true)
})
</script>

<template>
  <div class="partida">
    <div class="hud">
      <div>Aciertos <strong>{{ store.aciertos }}</strong></div>
      <div>Puntaje <strong>{{ store.puntaje }}</strong></div>
      <div>Tiempo <strong>{{ segundos }}s</strong></div>
    </div>
    <div v-if="sala" class="rivales">
      <span v-for="r in online.ranking" :key="r.id" :class="{ yo: r.id === online.jugador?.id }">
        {{ r.nombre }} <strong>{{ r.puntaje }}</strong>
      </span>
    </div>
    <div ref="contenedor"></div>
  </div>
</template>
