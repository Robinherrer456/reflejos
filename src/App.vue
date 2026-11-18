<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import MenuView from './components/MenuView.vue'
import OnlineView from './components/OnlineView.vue'
import SalaView from './components/SalaView.vue'
import GameView from './components/GameView.vue'
import GameOverView from './components/GameOverView.vue'
import RankingView from './components/RankingView.vue'
import RecordsView from './components/RecordsView.vue'
import { bus } from './events/bus.js'
import { PLAYERS_CHANGED, MATCH_STARTED, SCORE_UPDATE, MATCH_ENDED } from './events/nombres.js'
import { useOnlineStore } from './stores/online.js'

const online = useOnlineStore()
const pantalla = ref('menu')
const modoId = ref('rapido')
const partida = ref(0)
const sala = ref(null)
const resultado = ref({ puntaje: 0, aciertos: 0, fallos: 0 })

// Los eventos de red llegan por el bus y se guardan en Pinia
const alJugadores = ({ jugadores }) => online.setJugadores(jugadores)
const alIniciar = (datos) => online.empezar(datos)
const alPuntaje = (datos) => online.puntaje(datos)
const alFinal = (datos) => online.terminado(datos)

onMounted(() => {
  bus.on(PLAYERS_CHANGED, alJugadores)
  bus.on(MATCH_STARTED, alIniciar)
  bus.on(SCORE_UPDATE, alPuntaje)
  bus.on(MATCH_ENDED, alFinal)
})

onBeforeUnmount(() => {
  bus.off(PLAYERS_CHANGED, alJugadores)
  bus.off(MATCH_STARTED, alIniciar)
  bus.off(SCORE_UPDATE, alPuntaje)
  bus.off(MATCH_ENDED, alFinal)
})

// Cuando el anfitrion inicia, todos pasan a la partida con la misma semilla
watch(
  () => online.partida,
  (p) => {
    if (p) {
      modoId.value = p.modoId
      partida.value++
      pantalla.value = 'juego'
    }
  }
)

function jugar(id) {
  sala.value = null
  modoId.value = id
  partida.value++
  pantalla.value = 'juego'
}

function conectada(s) {
  sala.value = s
  online.entrar(s.codigo, s.jugador)
  pantalla.value = 'sala'
}

function terminar(datos) {
  resultado.value = datos
  pantalla.value = sala.value ? 'ranking' : 'gameover'
}

function volverSala() {
  online.volverASala()
  pantalla.value = 'sala'
}

async function salir() {
  if (sala.value) await sala.value.salir()
  sala.value = null
  online.salir()
  pantalla.value = 'menu'
}
</script>

<template>
  <MenuView
    v-if="pantalla === 'menu'"
    @jugar="jugar"
    @online="pantalla = 'online'"
    @records="pantalla = 'records'"
  />
  <OnlineView
    v-else-if="pantalla === 'online'"
    @conectada="conectada"
    @volver="pantalla = 'menu'"
  />
  <SalaView v-else-if="pantalla === 'sala'" :sala="sala" @salir="salir" />
  <GameView
    v-else-if="pantalla === 'juego'"
    :key="partida"
    :modo-id="modoId"
    :semilla="sala ? online.partida?.semilla : null"
    :sala="sala"
    @terminado="terminar"
  />
  <RankingView v-else-if="pantalla === 'ranking'" @sala="volverSala" @salir="salir" />
  <GameOverView
    v-else-if="pantalla === 'gameover'"
    :resultado="resultado"
    @jugar="jugar(modoId)"
    @records="pantalla = 'records'"
  />
  <RecordsView v-else @volver="pantalla = 'menu'" />
</template>
