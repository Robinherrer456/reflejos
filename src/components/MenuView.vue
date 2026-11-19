<script setup>
import { computed, ref } from 'vue'
import modos from '../data/modos.json'

const emit = defineEmits(['jugar', 'online', 'records', 'ajustes', 'escenarios'])
const elegido = ref(modos[0].id)
const modoElegido = computed(() => modos.find((modo) => modo.id === elegido.value) ?? modos[0])
const seg = (ms) => String(ms / 1000).replace('.', ',')
</script>

<template>
  <div class="menu2">
    <span class="orbe o1" aria-hidden="true"></span>
    <span class="orbe o2" aria-hidden="true"></span>
    <span class="orbe o3" aria-hidden="true"></span>

    <header class="menu-header">
      <div class="menu-brand">
        <span class="brand-mark" aria-hidden="true">R</span>
        <span>
          <strong>Reflejos</strong>
          <small>Entrena tu punter&iacute;a</small>
        </span>
      </div>

      <nav class="menu-nav" aria-label="Navegaci&oacute;n principal">
        <button class="menu-link" @click="emit('escenarios')">Escenarios</button>
        <button class="menu-link" @click="emit('records')">R&eacute;cords</button>
        <button class="menu-link" @click="emit('ajustes')">Ajustes</button>
        <button class="menu-link menu-link-online" @click="emit('online')">Jugar online</button>
      </nav>
    </header>

    <main class="menu-content">
      <section class="menu-hero">
        <div class="hero-copy">
          <p class="menu-eyebrow"><span></span> Entrenamiento de precisi&oacute;n</p>
          <h1>Afina tus reflejos.<br /><span>Domina cada disparo.</span></h1>
          <p class="hero-description">
            Entrena tu punter&iacute;a, mejora tu tiempo de reacci&oacute;n y supera tu mejor marca.
          </p>
        </div>

        <div class="quick-launch">
          <div class="launch-info">
            <span class="launch-label">Entrenamiento seleccionado</span>
            <strong>{{ modoElegido.nombre }}</strong>
            <span class="launch-duration">{{ modoElegido.duracionSeg }} segundos de partida</span>
          </div>
          <button class="launch-button" @click="emit('jugar', elegido)">
            <span>Empezar entrenamiento</span>
            <span class="launch-arrow" aria-hidden="true">&rarr;</span>
          </button>
        </div>
      </section>

      <section class="mode-section" aria-labelledby="mode-title">
        <div class="section-heading">
          <div>
            <p class="menu-eyebrow">Elige tu ritmo</p>
            <h2 id="mode-title">Modos de juego</h2>
          </div>
          <span class="mode-hint">Selecciona un modo para continuar</span>
        </div>

        <div class="modos-grid">
          <button
            v-for="modo in modos"
            :key="modo.id"
            type="button"
            class="modo-card"
            :class="{ activo: modo.id === elegido }"
            :style="{ '--c': modo.color }"
            :aria-pressed="modo.id === elegido"
            @click="elegido = modo.id"
          >
            <span class="mode-card-top">
              <span class="mode-name">{{ modo.nombre }}</span>
              <span class="mode-check" aria-hidden="true">{{ modo.id === elegido ? '\u2713' : '+' }}</span>
            </span>
            <span class="mode-description">{{ modo.descripcion }}</span>
            <span class="mode-stats">
              <span><small>Duraci&oacute;n</small><strong>{{ modo.duracionSeg }} s</strong></span>
              <span><small>Objetivo cada</small><strong>{{ seg(modo.apareceCadaMs) }} s</strong></span>
              <span><small>Puntos</small><strong>{{ modo.puntos }} por acierto</strong></span>
            </span>
          </button>
        </div>
      </section>
    </main>
  </div>
</template>
