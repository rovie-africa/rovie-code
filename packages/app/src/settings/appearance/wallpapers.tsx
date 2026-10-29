import { Show, createSignal, onMount, type Component } from "solid-js"
import { Switch } from "@opencode/ui/switch"
import { SettingsRow } from "@/settings/row"

export interface MetArtwork {
  readonly objectID: number
  readonly title: string
  readonly artist: string
  readonly imageUrl: string
}

export const MET_SEED_ARTWORKS: readonly MetArtwork[] = [
  {
    objectID: 436535,
    title: "Wheat Field with Cypresses",
    artist: "Vincent van Gogh",
    imageUrl: "https://images.metmuseum.org/CRDImages/ep/web-large/DP-42549-001.jpg",
  },
  {
    objectID: 459189,
    title: "Landscape with Stars",
    artist: "Henri-Edmond Cross",
    imageUrl: "https://images.metmuseum.org/CRDImages/rl/web-large/DP359010.jpg",
  },
  {
    objectID: 45434,
    title: "Under the Wave off Kanagawa",
    artist: "Katsushika Hokusai",
    imageUrl: "https://images.metmuseum.org/CRDImages/as/web-large/DP130155.jpg",
  },
  {
    objectID: 436528,
    title: "Irises",
    artist: "Vincent van Gogh",
    imageUrl: "https://images.metmuseum.org/CRDImages/ep/web-large/DP346474.jpg",
  },
  {
    objectID: 11122,
    title: "The Gulf Stream",
    artist: "Winslow Homer",
    imageUrl: "https://images.metmuseum.org/CRDImages/ad/web-large/DP-20821-001.jpg",
  },
  {
    objectID: 10497,
    title: "The Oxbow",
    artist: "Thomas Cole",
    imageUrl: "https://images.metmuseum.org/CRDImages/ad/web-large/DP-12550-001.jpg",
  },
  {
    objectID: 437658,
    title: "Study for A Sunday on La Grande Jatte",
    artist: "Georges Seurat",
    imageUrl: "https://images.metmuseum.org/CRDImages/ep/web-large/DP259921.jpg",
  },
  {
    objectID: 436947,
    title: "Boating",
    artist: "Edouard Manet",
    imageUrl: "https://images.metmuseum.org/CRDImages/ep/web-large/DP-25466-001.jpg",
  },
  {
    objectID: 812963,
    title: "Textile with Diaper Pattern",
    artist: "Egyptian",
    imageUrl: "https://images.metmuseum.org/CRDImages/md/web-large/LC_TR_311_7_2018-s01.jpg",
  },
  {
    objectID: 812964,
    title: "Wool Textile with Geometric Pattern",
    artist: "Egyptian",
    imageUrl: "https://images.metmuseum.org/CRDImages/md/web-large/LC_TR_311_8_2018-s01.jpg",
  },
  {
    objectID: 359362,
    title: "Landscape",
    artist: "Edgar Degas",
    imageUrl: "https://images.metmuseum.org/CRDImages/dp/web-large/DP815958.jpg",
  },
  {
    objectID: 435882,
    title: "Still Life with Apples",
    artist: "Paul Cézanne",
    imageUrl: "https://images.metmuseum.org/CRDImages/ep/web-large/DT47.jpg",
  },
] as const

const ENABLED_STORAGE_KEY = "rovie.wallpaper.enabled.v1"

function loadEnabled(): boolean {
  if (typeof localStorage !== "object") return true
  try {
    const raw = localStorage.getItem(ENABLED_STORAGE_KEY)
    if (raw === null) return true
    return raw !== "false"
  } catch {
    return true
  }
}

const [enabled, setEnabledSignal] = createSignal<boolean>(loadEnabled())
const [pool, setPool] = createSignal<readonly MetArtwork[]>(MET_SEED_ARTWORKS)

function pickRandomArtwork(list: readonly MetArtwork[], excludeId?: number): MetArtwork {
  const candidates = excludeId && list.length > 1 ? list.filter((item) => item.objectID !== excludeId) : list
  const index = Math.floor(Math.random() * candidates.length)
  return candidates[index] ?? MET_SEED_ARTWORKS[0]!
}

const [currentArtwork, setCurrentArtwork] = createSignal<MetArtwork>(pickRandomArtwork(MET_SEED_ARTWORKS))

let metSearchIdsCache: number[] | null = null

async function fetchRandomMetArtworkFromApi(): Promise<MetArtwork | null> {
  try {
    if (!metSearchIdsCache || metSearchIdsCache.length === 0) {
      const searchRes = await fetch(
        "https://collectionapi.metmuseum.org/public/collection/v1.1/search?isPublicDomain=true&hasImages=true&isHighlight=true&q=landscape&limit=80",
      )
      if (searchRes.ok) {
        const data = (await searchRes.json()) as { objectIDs?: number[] }
        if (Array.isArray(data.objectIDs) && data.objectIDs.length > 0) {
          metSearchIdsCache = data.objectIDs
        }
      }
    }

    const ids = metSearchIdsCache
    if (!ids || ids.length === 0) return null

    const randomId = ids[Math.floor(Math.random() * ids.length)]
    if (!randomId) return null

    const objRes = await fetch(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${randomId}`)
    if (!objRes.ok) return null

    const obj = (await objRes.json()) as {
      objectID?: number
      title?: string
      artistDisplayName?: string
      culture?: string
      primaryImageSmall?: string
      primaryImage?: string
    }

    const imageUrl = obj.primaryImageSmall || obj.primaryImage
    if (!obj.objectID || !imageUrl) return null

    const artwork: MetArtwork = {
      objectID: obj.objectID,
      title: obj.title || "Untitled",
      artist: obj.artistDisplayName || obj.culture || "The Met Collection",
      imageUrl,
    }

    setPool((prev) => (prev.some((item) => item.objectID === artwork.objectID) ? prev : [...prev, artwork]))
    return artwork
  } catch {
    return null
  }
}

export function useWallpaper() {
  const setEnabled = (value: boolean) => {
    setEnabledSignal(value)
    if (typeof localStorage === "object") {
      try {
        localStorage.setItem(ENABLED_STORAGE_KEY, String(value))
      } catch {}
    }
  }

  const randomize = () => {
    const next = pickRandomArtwork(pool(), currentArtwork().objectID)
    setCurrentArtwork(next)
    void fetchRandomMetArtworkFromApi().then((fetched) => {
      if (fetched && typeof Image !== "undefined") {
        const img = new Image()
        img.src = fetched.imageUrl
      }
    })
    return next
  }

  return {
    enabled,
    setEnabled,
    artwork: currentArtwork,
    randomize,
  }
}

export const WallpaperLayer: Component = () => {
  const wallpaper = useWallpaper()

  onMount(() => {
    wallpaper.randomize()
  })

  return (
    <Show when={wallpaper.enabled()}>
      <div
        data-slot="rovie-wallpaper-layer"
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 overflow-hidden select-none -z-20"
      >
        <div
          class="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            "background-image": `url("${wallpaper.artwork().imageUrl}")`,
          }}
        />
        <div
          class="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 52% 34% at 50% 34%, rgba(0, 0, 0, 0.48) 0%, rgba(0, 0, 0, 0.14) 65%, transparent 100%)",
          }}
        />
      </div>
    </Show>
  )
}

export const WallpaperSettingsRow: Component = () => {
  const wallpaper = useWallpaper()

  return (
    <SettingsRow title="New session background">
      <div data-action="settings-wallpaper-toggle">
        <Switch
          checked={wallpaper.enabled()}
          onChange={(checked) => wallpaper.setEnabled(checked)}
        />
      </div>
    </SettingsRow>
  )
}
