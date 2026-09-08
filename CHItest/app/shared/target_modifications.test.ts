import { describe, expect, it } from 'vitest'
import { images } from './config'

describe('researcher target modifications', () => {
  it('attaches a hidden spec to every stimulus', () => {
    expect(images).toHaveLength(20)
    for (const image of images) {
      expect(image.current_visual_state, image.image_id).toBeTruthy()
      expect(image.target_modification, image.image_id).toBeTruthy()
      const keys = Object.keys(image.target_modification ?? {})
      expect(keys.length).toBeGreaterThan(0)
      for (const dim of image.primary_target) {
        expect(keys, image.image_id).toContain(dim)
      }
    }
  })
})
