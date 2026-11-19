import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useJuegoStore } from '../juego.js'

describe('juego store records', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('persists the end-of-game statistics with the score', () => {
    const juego = useJuegoStore()
    const estadisticas = { precision: 82, reaccionPromedio: 410, mejorRacha: 7 }

    juego.guardarRecord('Jugador', 120, estadisticas)

    expect(juego.tablaRecords[0]).toMatchObject({
      nombre: 'Jugador',
      puntaje: 120,
      ...estadisticas,
    })
    expect(JSON.parse(localStorage.getItem('reflejos-records'))[0]).toMatchObject(estadisticas)
  })

  it('updates the name of the automatically saved record', () => {
    const juego = useJuegoStore()
    juego.guardarRecord('Jugador', 120)

    expect(juego.renombrarRecord(juego.ultimoRecordId, 'Robin')).toBe(true)
    expect(JSON.parse(localStorage.getItem('reflejos-records'))[0].nombre).toBe('Robin')
  })
})
