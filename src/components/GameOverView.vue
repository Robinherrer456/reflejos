<script setup>
import { ref } from 'vue'
import { useJuegoStore } from '../stores/juego.js'

const props = defineProps({ resultado: { type: Object, required: true } })
const emit = defineEmits(['jugar', 'records'])

const store = useJuegoStore()
const nombre = ref('')

// Se calcula una sola vez, antes de guardar
const puesto = store.tablaRecords.filter((r) => r.puntaje >= props.resultado.puntaje).length + 1
const entra = props.resultado.puntaje > 0 && puesto <= 10

function seguir(destino) {
  if (entra) {
    store.guardarRecord(nombre.value.trim() || 'Anonimo', props.resultado.puntaje)
  }
  emit(destino)
}
</script>

<template>
  <div class="pantalla">
    <h2>Se acab&oacute; el tiempo</h2>
    <p class="puntos-final">{{ resultado.puntaje }}</p>
    <p>puntos</p>
    <p>{{ resultado.aciertos }} aciertos &middot; {{ resultado.fallos }} fallos</p>

    <p v-if="entra" class="aviso">Entraste al puesto {{ puesto }}</p>
    <input v-if="entra" v-model="nombre" maxlength="12" placeholder="Tu nombre" />

    <button class="principal" @click="seguir('jugar')">
      {{ entra ? 'Guardar y jugar otra vez' : 'Jugar otra vez' }}
    </button>
    <button @click="seguir('records')">
      {{ entra ? 'Guardar y ver r\u00e9cords' : 'Ver r\u00e9cords' }}
    </button>
  </div>
</template>
