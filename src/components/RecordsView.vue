<script setup>
import { onMounted } from 'vue'
import { useJuegoStore } from '../stores/juego.js'

const emit = defineEmits(['volver'])
const store = useJuegoStore()

onMounted(() => store.cargarRecords())
</script>

<template>
  <div class="pantalla">
    <h2>Mejores 10</h2>
    <p v-if="store.tablaRecords.length === 0">
      Todav&iacute;a no hay puntajes. Juega una partida para estrenar la tabla.
    </p>
    <ol v-else class="tabla">
      <li v-for="(r, i) in store.tablaRecords" :key="i">
        <span>{{ i + 1 }}</span>
        <span>{{ r.nombre }}</span>
        <span>{{ r.puntaje }}</span>
      </li>
    </ol>
    <button class="principal" @click="emit('volver')">Volver al men&uacute;</button>
  </div>
</template>
