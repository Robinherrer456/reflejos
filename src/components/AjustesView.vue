<script setup>
import { watch, computed } from 'vue'
import miras from '../data/miras.json'
import { trazosMira } from '../utils/mira.js'
import { useAjustesStore } from '../stores/ajustes.js'
import { useJuegoStore } from '../stores/juego.js'
import { bus } from '../events/bus.js'
import { SOUND_TOGGLED } from '../events/nombres.js'

const emit = defineEmits(['volver'])
const aj = useAjustesStore()
const juego = useJuegoStore()

const trazos = computed(() => trazosMira(aj.miraEstilo, aj.miraEscala * 1.8))

watch(
  () => [
    aj.miraEstilo,
    aj.miraColor,
    aj.miraEscala,
    aj.arma,
    aj.sensibilidad,
    aj.campoVision,
    aj.mostrarArma,
  ],
  () => aj.guardar()
)

function alternarSonido() {
  juego.alternarSonido()
  bus.emit(SOUND_TOGGLED, { activo: juego.sonido })
}

</script>

<template>
  <div class="pantalla ancha">
    <h2>Ajustes</h2>

    <section class="ajuste">
      <h3>Mira</h3>
      <div class="vista-mira">
        <svg viewBox="-40 -40 80 80" width="130" height="130">
          <g v-for="(t, i) in trazos" :key="'s' + i">
            <line v-if="t.t === 'l'" :x1="t.x1" :y1="t.y1" :x2="t.x2" :y2="t.y2"
              stroke="#000" stroke-opacity="0.45" stroke-width="4" />
            <circle v-else :r="t.r" fill="none" stroke="#000" stroke-opacity="0.45"
              :stroke-width="t.relleno ? t.r * 2 + 2 : 4" />
          </g>
          <g v-for="(t, i) in trazos" :key="'c' + i">
            <line v-if="t.t === 'l'" :x1="t.x1" :y1="t.y1" :x2="t.x2" :y2="t.y2"
              :stroke="aj.miraColor" stroke-width="2" />
            <circle v-else :r="t.r" :fill="t.relleno ? aj.miraColor : 'none'"
              :stroke="t.relleno ? 'none' : aj.miraColor" stroke-width="2" />
          </g>
        </svg>
      </div>
      <div class="fila">
        <button v-for="e in miras.estilos" :key="e.id"
          :class="{ activo: aj.miraEstilo === e.id }" @click="aj.miraEstilo = e.id">
          {{ e.nombre }}
        </button>
      </div>
      <div class="fila">
        <button v-for="c in miras.colores" :key="c.id" class="color"
          :class="{ activo: aj.miraColor === c.hex }" :style="{ background: c.hex }"
          :title="c.nombre" @click="aj.miraColor = c.hex"></button>
      </div>
      <label class="tamano">Tama&ntilde;o
        <input type="range" min="0.7" max="2" step="0.1" v-model.number="aj.miraEscala" />
      </label>
    </section>

    <section class="ajuste">
      <h3>Arma</h3>
      <label class="opcion-ajuste">
        <input v-model="aj.arma" type="radio" name="arma" value="arma1" />
        Arma 1 · Pistola y guantes
      </label>
      <label class="opcion-ajuste">
        <input v-model="aj.arma" type="radio" name="arma" value="arma2" />
        Arma 2 · Solo pistola
      </label>
    </section>

    <section class="ajuste">
      <h3>Juego</h3>
      <label class="tamano">
        Sensibilidad del rat&oacute;n <strong>{{ aj.sensibilidad.toFixed(1) }}&times;</strong>
        <input v-model.number="aj.sensibilidad" type="range" min="0.5" max="2" step="0.1" />
      </label>
      <label class="tamano">
        Campo de visi&oacute;n <strong>{{ aj.campoVision }}&deg;</strong>
        <input v-model.number="aj.campoVision" type="range" min="70" max="110" step="5" />
      </label>
      <label class="opcion-ajuste">
        <input v-model="aj.mostrarArma" type="checkbox" />
        Mostrar arma
      </label>
    </section>

    <section class="ajuste">
      <h3>Sonido</h3>
      <div class="fila">
        <button :class="{ activo: juego.sonido }" @click="alternarSonido">
          {{ juego.sonido ? 'Activado' : 'Silenciado' }}
        </button>
      </div>
    </section>

    <button class="principal" @click="emit('volver')">Volver al men&uacute;</button>
  </div>
</template>
