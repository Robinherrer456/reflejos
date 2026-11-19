import { defineStore } from 'pinia'

const CLAVE_RECORDS = 'reflejos-records'

export const useJuegoStore = defineStore('juego', {
  state: () => ({
    puntaje: 0,
    aciertos: 0,
    tablaRecords: [],
    sonido: true,
    ultimoRecordId: null,
  }),

  actions: {
    reiniciar() {
      this.puntaje = 0
      this.aciertos = 0
    },

    sumarAcierto(puntos) {
      this.aciertos++
      this.puntaje += puntos
    },

    alternarSonido() {
      this.sonido = !this.sonido
    },

    cargarRecords() {
      const guardado = localStorage.getItem(CLAVE_RECORDS)
      this.tablaRecords = guardado ? JSON.parse(guardado) : []
    },

    // Devuelve el puesto (1 a 10) si entro en la tabla, o null si no entro
    guardarRecord(nombre, puntaje, estadisticas = {}) {
      const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
      this.ultimoRecordId = id
      this.tablaRecords.push({ id, nombre, puntaje, ...estadisticas })
      this.tablaRecords.sort((a, b) => b.puntaje - a.puntaje)
      this.tablaRecords = this.tablaRecords.slice(0, 10)
      localStorage.setItem(CLAVE_RECORDS, JSON.stringify(this.tablaRecords))

      const puesto = this.tablaRecords.findIndex((r) => r.id === id)
      return puesto === -1 ? null : puesto + 1
    },

    renombrarRecord(id, nombre) {
      const record = this.tablaRecords.find((r) => r.id === id)
      if (!record) return false
      record.nombre = nombre
      localStorage.setItem(CLAVE_RECORDS, JSON.stringify(this.tablaRecords))
      return true
    },
  },
})
