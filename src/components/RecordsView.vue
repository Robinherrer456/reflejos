<script setup>
import { onMounted } from 'vue'
import { useJuegoStore } from '../stores/juego.js'

const emit = defineEmits(['volver'])
const store = useJuegoStore()
const medallas = ['1', '2', '3']

onMounted(() => store.cargarRecords())
</script>

<template>
  <main class="records-screen">
    <header class="records-header">
      <div class="trophy-icon" aria-hidden="true">
        <svg viewBox="0 0 48 48" fill="none">
          <path d="M15 7h18v10c0 8-4 13-9 13s-9-5-9-13V7Z" />
          <path d="M15 11H7v5c0 7 4 11 11 11M33 11h8v5c0 7-4 11-11 11M24 30v8m-9 4h18m-15-4h12" />
        </svg>
      </div>
      <div>
        <p class="menu-eyebrow">Tu progreso</p>
        <h1>Mejores 10</h1>
        <p class="records-subtitle">Los mejores puntajes de este dispositivo</p>
      </div>
    </header>

    <p v-if="store.tablaRecords.length === 0" class="records-empty">
      A&uacute;n no hay puntajes. Juega una partida y estrena la tabla.
    </p>
    <ol v-else class="records-list">
      <li
        v-for="(record, i) in store.tablaRecords.slice(0, 10)"
        :key="`${record.nombre}-${record.puntaje}-${i}`"
        class="record-row"
        :class="`puesto-${i + 1}`"
      >
        <span class="record-rank">
          <svg v-if="i === 0" viewBox="0 0 48 48" fill="none" aria-label="Trofeo, primer puesto">
            <path d="M15 7h18v10c0 8-4 13-9 13s-9-5-9-13V7Z" />
            <path d="M15 11H7v5c0 7 4 11 11 11M33 11h8v5c0 7-4 11-11 11M24 30v8m-9 4h18m-15-4h12" />
          </svg>
          <span v-else>{{ medallas[i] || String(i + 1).padStart(2, '0') }}</span>
        </span>
        <span class="record-player">{{ record.nombre }}</span>
        <strong class="record-score">{{ record.puntaje }}</strong>
        <span class="record-points">pts</span>
      </li>
    </ol>

    <button class="records-back" @click="emit('volver')">
      <span aria-hidden="true">&larr;</span> Volver al men&uacute;
    </button>
  </main>
</template>
