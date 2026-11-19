// Geometria de la mira: la usan Phaser (juego) y Vue (vista previa de Ajustes)
export function trazosMira(estilo, escala = 1) {
  const e = escala
  const cruz = [
    { t: 'l', x1: -13 * e, y1: 0, x2: -4 * e, y2: 0 },
    { t: 'l', x1: 4 * e, y1: 0, x2: 13 * e, y2: 0 },
    { t: 'l', x1: 0, y1: -13 * e, x2: 0, y2: -4 * e },
    { t: 'l', x1: 0, y1: 4 * e, x2: 0, y2: 13 * e },
  ]
  if (estilo === 'punto') return [{ t: 'c', r: 2.6 * e, relleno: true }]
  if (estilo === 'circulo') {
    return [{ t: 'c', r: 9 * e, relleno: false }, { t: 'c', r: 1.6 * e, relleno: true }]
  }
  if (estilo === 'cruz-punto') return [...cruz, { t: 'c', r: 1.6 * e, relleno: true }]
  return cruz
}
