<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { crearArma3D } from '../arma3d/arma3d.js'

const props = defineProps({
  tipoArma: { type: String, default: 'arma1' },
})

const caja = ref(null)
let arma = null

function actualizarArma() {
  arma?.destruir()
  arma = crearArma3D(caja.value, props.tipoArma)
}

onMounted(actualizarArma)
watch(() => props.tipoArma, actualizarArma)
onBeforeUnmount(() => { if (arma) arma.destruir() })
</script>

<template>
  <div ref="caja" class="arma3d"></div>
</template>
