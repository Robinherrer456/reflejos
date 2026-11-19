import { defineStore } from 'pinia'

const CLAVE = 'reflejos-ajustes'
const base = {
  miraEstilo: 'cruz',
  miraColor: '#FFFFFF',
  miraEscala: 1,
  escenario: 'oscura',
  arma: 'arma1',
  sensibilidad: 1,
  campoVision: 90,
  mostrarArma: true,
}

// Ajustes que la interfaz de Vue muestra y el jugador cambia
export const useAjustesStore = defineStore('ajustes', {
  state: () => ({ ...base }),
  actions: {
    cargar() {
      try {
        const guardado = JSON.parse(localStorage.getItem(CLAVE))
        if (guardado) Object.assign(this, { ...base, ...guardado })
      } catch (e) {
        // sin ajustes guardados: se usan los de base
      }
    },
    guardar() {
      localStorage.setItem(
        CLAVE,
        JSON.stringify({
          miraEstilo: this.miraEstilo,
          miraColor: this.miraColor,
          miraEscala: this.miraEscala,
          escenario: this.escenario,
          arma: this.arma,
          sensibilidad: this.sensibilidad,
          campoVision: this.campoVision,
          mostrarArma: this.mostrarArma,
        })
      )
    },
  },
})
