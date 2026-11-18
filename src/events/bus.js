import Phaser from 'phaser'

// Unico puente entre Vue y Phaser
export const bus = new Phaser.Events.EventEmitter()
