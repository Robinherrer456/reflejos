<script setup>
import { ref } from 'vue'
import { useJuegoStore } from '../stores/juego.js'

const props = defineProps({ resultado: { type: Object, required: true } })
const emit = defineEmits(['jugar', 'records'])
const juego = useJuegoStore()
const nombre = ref('')

function seguir(destino) {
  const nuevoNombre = nombre.value.trim()
  if (props.resultado.recordGuardado && nuevoNombre) {
    juego.renombrarRecord(props.resultado.recordId, nuevoNombre)
  }
  emit(destino)
}
</script>

<template>
  <div class="pantalla">
    <h2>Se acab&oacute; el tiempo</h2>
    <p v-if="resultado.recordGuardado" class="aviso">Tu marca se guard&oacute; en R&eacute;cords. Puedes personalizar el nombre:</p>
    <input
      v-if="resultado.recordGuardado"
      v-model="nombre"
      maxlength="12"
      placeholder="Jugador"
      aria-label="Nombre para el récord"
    />
    <section class="resumen-final" aria-label="Resumen de la partida">
      <div>
        <small>Puntos totales</small>
        <strong class="puntos-final">{{ resultado.puntaje }}</strong>
      </div>
      <div><small>Precisi&oacute;n</small><strong>{{ resultado.precision }}%</strong></div>
      <div><small>Reacci&oacute;n promedio</small><strong>{{ resultado.reaccionPromedio }} ms</strong></div>
      <div><small>Mejor racha</small><strong>{{ resultado.mejorRacha }}</strong></div>
      <div><small>Aciertos</small><strong>{{ resultado.aciertos }}</strong></div>
      <div><small>Fallos</small><strong>{{ resultado.fallos }}</strong></div>
    </section>

    <button class="principal" @click="seguir('jugar')">
      Jugar otra vez
    </button>
    <button @click="seguir('records')">Ver r&eacute;cords</button>
  </div>
</template>
