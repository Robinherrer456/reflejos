<script setup>
import { computed } from 'vue'
import { useOnlineStore } from '../stores/online.js'

const emit = defineEmits(['sala', 'salir'])
const online = useOnlineStore()
const todosTerminaron = computed(
  () => online.ranking.length > 0 && online.ranking.every((r) => r.terminado)
)
</script>

<template>
  <div class="pantalla">
    <h2>Ranking</h2>
    <p v-if="!todosTerminaron" class="o">Esperando a que terminen los dem&aacute;s...</p>
    <ol class="tabla">
      <li v-for="(r, i) in online.ranking" :key="r.id">
        <span>{{ i + 1 }}</span>
        <span>
          {{ r.nombre }}<small v-if="r.id === online.jugador?.id"> (t&uacute;)</small>
          <small v-if="!r.terminado"> jugando...</small>
        </span>
        <span>{{ r.puntaje }}</span>
      </li>
    </ol>
    <button class="principal" @click="emit('sala')">Volver a la sala</button>
    <button @click="emit('salir')">Salir</button>
  </div>
</template>
