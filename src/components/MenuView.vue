<script setup>
import { ref } from 'vue'
import modos from '../data/modos.json'

const emit = defineEmits(['jugar', 'online', 'records'])
const elegido = ref(modos[0].id)
const seg = (ms) => String(ms / 1000).replace('.', ',')
</script>

<template>
  <div class="menu">
    <header class="menu-titulo">
      <h1>Reflejos</h1>
      <p>Toca las esferas antes de que desaparezcan</p>
    </header>

    <div class="modos-grid">
      <div
        v-for="m in modos"
        :key="m.id"
        class="modo"
        :class="{ activo: m.id === elegido }"
        :style="{ '--c': m.color }"
        role="button"
        tabindex="0"
        @click="elegido = m.id"
        @keydown.enter="elegido = m.id"
      >
        <div class="modo-nombre">{{ m.nombre }}</div>
        <div class="modo-desc">{{ m.descripcion }}</div>
        <ul class="modo-datos">
          <li><span>Duraci&oacute;n</span><strong>{{ m.duracionSeg }} s</strong></li>
          <li><span>Aparece cada</span><strong>{{ seg(m.apareceCadaMs) }} s</strong></li>
          <li><span>Cada esfera dura</span><strong>{{ seg(m.vidaMs) }} s</strong></li>
          <li><span>Puntos por acierto</span><strong>{{ m.puntos }}</strong></li>
        </ul>
      </div>
    </div>

    <div class="menu-acciones">
      <button class="principal" @click="emit('jugar', elegido)">Jugar</button>
      <button @click="emit('online')">Jugar online</button>
      <button @click="emit('records')">Ver r&eacute;cords</button>
    </div>
  </div>
</template>
