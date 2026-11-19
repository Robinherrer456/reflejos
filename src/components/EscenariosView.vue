<script setup>
import { computed, watch } from 'vue'
import escenarios from '../data/escenarios.json'
import { useAjustesStore } from '../stores/ajustes.js'

const emit = defineEmits(['volver'])
const ajustes = useAjustesStore()
const elegido = computed(
  () => escenarios.find((escenario) => escenario.id === ajustes.escenario) ?? escenarios[0]
)

watch(
  () => ajustes.escenario,
  () => ajustes.guardar()
)
</script>

<template>
  <main class="scenarios-screen">
    <header class="scenarios-header">
      <button class="back-icon" aria-label="Volver al men&uacute;" @click="emit('volver')">
        &larr;
      </button>
      <div>
        <p class="menu-eyebrow">Personaliza tu entrenamiento</p>
        <h1>Elige tu escenario</h1>
        <p class="records-subtitle">El cambio se guarda autom&aacute;ticamente.</p>
      </div>
    </header>

    <section class="scenario-grid" aria-label="Escenarios disponibles">
      <button
        v-for="escenario in escenarios"
        :key="escenario.id"
        type="button"
        class="scenario-card"
        :class="{ activo: ajustes.escenario === escenario.id }"
        :aria-pressed="ajustes.escenario === escenario.id"
        @click="ajustes.escenario = escenario.id"
      >
        <span
          class="scenario-preview"
          :class="`preview-${escenario.id}`"
          :style="{
            '--preview-ceiling': escenario.techo,
            '--preview-wall': escenario.paredFondo,
            '--preview-floor': escenario.piso1,
            '--preview-sky-top': escenario.cieloArriba,
            '--preview-sky-bottom': escenario.cieloAbajo,
            '--preview-lines': escenario.lineasPiso,
          }"
          aria-hidden="true"
        >
          <span class="preview-stars"></span>
          <span class="preview-sun"></span>
          <span class="preview-panels"></span>
          <span class="preview-orb"></span>
          <span class="preview-horizon"></span>
          <span class="preview-floor-grid"></span>
          <span class="preview-platform"></span>
        </span>
        <span class="scenario-card-info">
          <span>
            <strong>{{ escenario.nombre }}</strong>
            <small>{{ escenario.descripcion }}</small>
          </span>
          <span class="scenario-selected" aria-hidden="true">
            {{ ajustes.escenario === escenario.id ? '\u2713' : '+' }}
          </span>
        </span>
      </button>
    </section>

    <footer class="scenario-footer">
      <span>Escenario activo: <strong>{{ elegido.nombre }}</strong></span>
      <button class="records-back" @click="emit('volver')">Volver al men&uacute;</button>
    </footer>
  </main>
</template>
