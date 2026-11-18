import { defineStore } from 'pinia'

// Estado de la sala online: lo que Vue muestra (codigo, jugadores, puntajes)
export const useOnlineStore = defineStore('online', {
  state: () => ({
    codigo: '',
    jugador: null,
    jugadores: [],
    puntajes: {},
    partida: null,
  }),

  getters: {
    ranking: (s) =>
      s.jugadores
        .map((j) => ({
          id: j.id,
          nombre: j.nombre,
          puntaje: s.puntajes[j.id]?.puntaje ?? 0,
          terminado: !!s.puntajes[j.id]?.terminado,
        }))
        .sort((a, b) => b.puntaje - a.puntaje),
  },

  actions: {
    entrar(codigo, jugador) {
      this.codigo = codigo
      this.jugador = jugador
      this.puntajes = {}
      this.partida = null
    },
    setJugadores(lista) {
      this.jugadores = lista
    },
    empezar(partida) {
      this.puntajes = {}
      this.partida = partida
    },
    puntaje(d) {
      const previo = this.puntajes[d.id]
      this.puntajes[d.id] = { puntaje: d.puntaje, terminado: previo?.terminado ?? false }
    },
    terminado(d) {
      this.puntajes[d.id] = { puntaje: d.puntaje, terminado: true }
    },
    volverASala() {
      this.partida = null
    },
    salir() {
      this.codigo = ''
      this.jugador = null
      this.jugadores = []
      this.puntajes = {}
      this.partida = null
    },
  },
})
