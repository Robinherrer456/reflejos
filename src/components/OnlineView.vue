<script setup>
import { ref, markRaw } from 'vue'
import { Sala, crearCodigo } from '../network/sala.js'

const emit = defineEmits(['conectada', 'volver'])
const nombre = ref('')
const codigo = ref('')
const error = ref('')
const cargando = ref(false)

async function conectar(cod) {
  error.value = ''
  const n = nombre.value.trim()
  if (!n) {
    error.value = 'Escribe tu nombre'
    return
  }
  cargando.value = true
  const jugador = { id: crypto.randomUUID(), nombre: n }
  const sala = markRaw(new Sala(cod, jugador))
  try {
    await sala.entrar()
    emit('conectada', sala)
  } catch (e) {
    error.value = 'No se pudo conectar. Revisa tu internet y las claves de Supabase.'
  } finally {
    cargando.value = false
  }
}

const crear = () => conectar(crearCodigo())

function unirse() {
  const c = codigo.value.trim().toUpperCase()
  if (c.length !== 4) {
    error.value = 'El c&oacute;digo tiene 4 letras'.replace('&oacute;', 'o')
    return
  }
  conectar(c)
}
</script>

<template>
  <div class="pantalla">
    <h2>Jugar online</h2>
    <input v-model="nombre" maxlength="12" placeholder="Tu nombre" />
    <button class="principal" :disabled="cargando" @click="crear">Crear sala</button>
    <p class="o">o entra a una sala con su c&oacute;digo</p>
    <input v-model="codigo" maxlength="4" placeholder="C&Oacute;DIGO" style="text-transform: uppercase" />
    <button :disabled="cargando" @click="unirse">Unirse</button>
    <p v-if="error" class="error">{{ error }}</p>
    <button @click="emit('volver')">Volver al men&uacute;</button>
  </div>
</template>
