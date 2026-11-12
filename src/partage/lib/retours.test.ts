import { describe, expect, it } from 'vitest'
import { MESSAGE_RETOUR_MAX, messageAvecContexte } from './retours'

describe('messageAvecContexte', () => {
  it('ajoute le contexte après le message', () => {
    expect(messageAvecContexte(' Le bouton ne répond pas ', 'Application iPhone 0.1.0 (5)')).toBe(
      'Le bouton ne répond pas\n\n— Application iPhone 0.1.0 (5)',
    )
  })
  it('laisse le message tel quel sans contexte', () => {
    expect(messageAvecContexte('Très pratique', null)).toBe('Très pratique')
  })
  it('omet le contexte plutôt que de couper le message', () => {
    const long = 'a'.repeat(MESSAGE_RETOUR_MAX - 5)
    expect(messageAvecContexte(long, 'Application Android 0.1.0 (5)')).toBe(long)
  })
})
