import { describe, expect, test } from "bun:test"
import { createRoot } from "solid-js"
import { MET_SEED_ARTWORKS, useWallpaper } from "./wallpapers"

describe("Met Museum new-session background", () => {
  test("provides verified public-domain Met Museum artworks", () => {
    expect(MET_SEED_ARTWORKS.length).toBeGreaterThanOrEqual(10)
    for (const art of MET_SEED_ARTWORKS) {
      expect(art.imageUrl).toStartWith("https://images.metmuseum.org/CRDImages/")
    }
  })

  test("toggles on/off and picks a random Met artwork on open", () => {
    createRoot((dispose) => {
      const wp = useWallpaper()
      expect(wp.enabled()).toBe(true)
      const firstId = wp.artwork().objectID
      const next = wp.randomize()
      expect(next.objectID).not.toBe(firstId)

      wp.setEnabled(false)
      expect(wp.enabled()).toBe(false)
      wp.setEnabled(true)
      expect(wp.enabled()).toBe(true)
      dispose()
    })
  })
})
