<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { crearArma3D } from '../arma3d/arma3d.js'

const caja = ref(null)
let arma = null

onMounted(() => { arma = crearArma3D(caja.value) })
onBeforeUnmount(() => { if (arma) arma.destruir() })
</script>

<template>
  <div ref="caja" class="arma3d"></div>
</template>
