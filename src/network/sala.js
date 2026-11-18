import { supabase } from './supabase.js'
import { bus } from '../events/bus.js'
import { PLAYERS_CHANGED, MATCH_STARTED, SCORE_UPDATE, MATCH_ENDED } from '../events/nombres.js'

// Letras sin confusion (sin I, O, 0, 1)
export function crearCodigo() {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  let codigo = ''
  for (let i = 0; i < 4; i++) codigo += letras[Math.floor(Math.random() * letras.length)]
  return codigo
}

// Una sala = un canal de Supabase Realtime. Todo lo que llega se convierte en eventos del bus.
export class Sala {
  constructor(codigo, jugador) {
    this.codigo = codigo
    this.jugador = jugador // { id, nombre }
    this.canal = null
  }

  entrar() {
    return new Promise((resolve, reject) => {
      this.canal = supabase.channel(`sala:${this.codigo}`, {
        config: { broadcast: { self: true }, presence: { key: this.jugador.id } },
      })

      this.canal
        .on('presence', { event: 'sync' }, () => {
          const estado = this.canal.presenceState()
          const jugadores = Object.values(estado)
            .map((lista) => lista[0])
            .sort((a, b) => a.unido - b.unido) // el primero en entrar es el anfitrion
          bus.emit(PLAYERS_CHANGED, { jugadores })
        })
        .on('broadcast', { event: MATCH_STARTED }, ({ payload }) => bus.emit(MATCH_STARTED, payload))
        .on('broadcast', { event: SCORE_UPDATE }, ({ payload }) => bus.emit(SCORE_UPDATE, payload))
        .on('broadcast', { event: MATCH_ENDED }, ({ payload }) => bus.emit(MATCH_ENDED, payload))
        .subscribe(async (estado) => {
          if (estado === 'SUBSCRIBED') {
            await this.canal.track({ ...this.jugador, unido: Date.now() })
            resolve()
          } else if (estado === 'CHANNEL_ERROR' || estado === 'TIMED_OUT') {
            reject(new Error('No se pudo conectar a la sala'))
          }
        })
    })
  }

  enviar(evento, datos) {
    return this.canal.send({ type: 'broadcast', event: evento, payload: datos })
  }

  // Lo llama el anfitrion: todos reciben la misma semilla y el mismo modo
  iniciar(modoId) {
    const semilla = Math.floor(Math.random() * 1e9)
    return this.enviar(MATCH_STARTED, { semilla, modoId })
  }

  enviarPuntaje(puntaje) {
    return this.enviar(SCORE_UPDATE, { ...this.jugador, puntaje })
  }

  terminar(puntaje) {
    return this.enviar(MATCH_ENDED, { ...this.jugador, puntaje })
  }

  salir() {
    return this.canal ? supabase.removeChannel(this.canal) : Promise.resolve()
  }
}
