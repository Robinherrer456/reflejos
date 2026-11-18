<script setup>
import { computed, ref } from 'vue'
import modos from '../data/modos.json'
import { useOnlineStore } from '../stores/online.js'

const props = defineProps({ sala: { type: Object, required: true } })
const emit = defineEmits(['salir'])

const online = useOnlineStore()
const modoId = ref(modos[0].id)
const esAnfitrion = computed(() => online.jugadores[0]?.id === online.jugador?.id)
</script>

<template>
  <div class="pantalla">
    <h2>Sala</h2>
    <p class="codigo-sala">{{ online.codigo }}</p>
    <p class="o">Comparte este c&oacute;digo con tus amigos</p>

    <ul class="jugadores">
      <li v-for="(j, i) in online.jugadores" :key="j.id">
        <span>{{ j.nombre }}</span>
        <span v-if="i === 0" class="insignia">Anfitri&oacute;n</span>
      </li>
    </ul>

    <template v-if="esAnfitrion">
      <div class="chips">
        <button
          v-for="m in modos"
          :key="m.id"
          :class="{ activo: m.id === modoId }"
          @click="modoId = m.id"
        >
          {{ m.nombre }}
        </button>
      </div>
      <button class="principal" @click="props.sala.iniciar(modoId)">Iniciar partida</button>
    </template>
    <p v-else class="o">Esperando a que el anfitri&oacute;n inicie la partida...</p>

    <button @click="emit('salir')">Salir de la sala</button>
  </div>
</template>
