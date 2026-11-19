import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAjustesStore } from '../ajustes.js'

describe('ajustes store', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('persists the selected weapon', () => {
    const ajustes = useAjustesStore()
    ajustes.arma = 'arma2'
    ajustes.guardar()

    setActivePinia(createPinia())
    const ajustesCargados = useAjustesStore()
    ajustesCargados.cargar()

    expect(ajustesCargados.arma).toBe('arma2')
  })
})
