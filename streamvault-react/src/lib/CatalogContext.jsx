import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { VIDEOS, CATEGORIES, CREATORS, MODELS } from '../data/catalog.js'
import {
  apiListVideos, apiHealth,
  apiListCategories, apiCreateCategory, apiDeleteCategory,
  apiListModels, apiCreateModel, apiDeleteModel,
} from './api.js'
import { store, storeSet } from './store.js'

const GRADS = [
  ['#c62b4a', '#6e1428'], ['#b34270', '#4a0f28'], ['#c2711d', '#6e2f10'], ['#1c7a70', '#0d423c'],
]

/* Map a server or local record into the shape the UI expects. */
function fromServer(v) {
  const ageMins = v.createdAt
    ? Math.max(1, Math.round((Date.now() - new Date(v.createdAt).getTime()) / 60000))
    : (v.ago || 1)
  return {
    ...v,
    ago: ageMins,
    grad: v.grad || GRADS[v.id % GRADS.length],
    icon: null, // VideoCard falls back to a clapperboard
    uploaded: true,
  }
}

const Ctx = createContext({
  videos: VIDEOS,
  serverVideos: [],
  categories: CATEGORIES,
  models: MODELS,
  creators: CREATORS,
  serverOnline: false,
  ffmpeg: false,
  loading: true,
  refresh: () => {},
  addCategory: async () => {},
  deleteCategory: async () => {},
  addModel: async () => {},
  deleteModel: async () => {},
})

export function CatalogProvider({ children }) {
  const [serverVideos, setServerVideos] = useState([])
  const [customCategories, setCustomCategories] = useState([])
  const [customModels, setCustomModels] = useState([])
  const [serverOnline, setServerOnline] = useState(false)
  const [ffmpeg, setFfmpeg] = useState(false)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const localExtra = (store('sv-admin-videos', []) || []).map(fromServer)
    const localCats = store('sv-custom-categories', []) || []
    const localModels = store('sv-custom-models', []) || []

    try {
      const [list, health, cats, mods] = await Promise.all([
        apiListVideos(),
        apiHealth(),
        apiListCategories(),
        apiListModels(),
      ])
      const fromApi = list.map(fromServer)
      // Merge unique by id
      const combined = [...fromApi, ...localExtra.filter((loc) => !fromApi.some((api) => String(api.id) === String(loc.id)))]
      setServerVideos(combined)
      setServerOnline(true)
      setFfmpeg(!!health.ffmpeg)

      const mergedCats = [...cats, ...localCats.filter((lc) => !cats.some((c) => c.slug === lc.slug))]
      setCustomCategories(mergedCats)

      const mergedMods = [...mods, ...localModels.filter((lm) => !mods.some((m) => m.id === lm.id))]
      setCustomModels(mergedMods)
    } catch {
      setServerVideos(localExtra)
      setCustomCategories(localCats)
      setCustomModels(localModels)
      setServerOnline(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const addCategory = async (catData) => {
    let newCat
    try {
      newCat = await apiCreateCategory(catData)
    } catch {
      const cleanSlug = (catData.slug || catData.name).toLowerCase().replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '')
      newCat = {
        slug: cleanSlug,
        name: catData.name.trim(),
        desc: catData.desc?.trim() || '',
        emoji: catData.emoji?.trim() || '📁',
        count: 0,
        custom: true,
        createdAt: new Date().toISOString(),
      }
    }
    const nextCats = [newCat, ...customCategories.filter((c) => c.slug !== newCat.slug)]
    setCustomCategories(nextCats)
    storeSet('sv-custom-categories', nextCats)
    return newCat
  }

  const deleteCategory = async (slug) => {
    try { await apiDeleteCategory(slug) } catch {}
    const nextCats = customCategories.filter((c) => c.slug !== slug)
    setCustomCategories(nextCats)
    storeSet('sv-custom-categories', nextCats)
  }

  const addModel = async (modelData, avatarFile) => {
    let newModel
    try {
      newModel = await apiCreateModel(modelData, avatarFile)
    } catch {
      const cleanId = (modelData.id || modelData.name).toLowerCase().replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '')
      newModel = {
        id: cleanId,
        name: modelData.name.trim(),
        avatar: modelData.photoUrl || (avatarFile ? URL.createObjectURL(avatarFile) : null),
        bio: modelData.bio?.trim() || '',
        about: modelData.bio?.trim() || '',
        externalUrl: modelData.externalUrl?.trim() || '',
        externalLabel: modelData.externalLabel?.trim() || 'View Profile',
        verified: modelData.verified === true || modelData.verified === 'true',
        collab: modelData.collab === true || modelData.collab === 'true',
        category: modelData.category?.trim() || 'all',
        subs: '0',
        views: 0,
        videoCount: 0,
        grad: ['#c62b4a', '#8f1d38'],
        custom: true,
        createdAt: new Date().toISOString(),
      }
    }
    const nextMods = [newModel, ...customModels.filter((m) => m.id !== newModel.id)]
    setCustomModels(nextMods)
    storeSet('sv-custom-models', nextMods)
    return newModel
  }

  const deleteModel = async (id) => {
    try { await apiDeleteModel(id) } catch {}
    const nextMods = customModels.filter((m) => m.id !== id)
    setCustomModels(nextMods)
    storeSet('sv-custom-models', nextMods)
  }

  const readyUploads = serverVideos.filter((v) => v.status === 'ready' || v.srcType === 'stream' || v.src || v.streamUrl || v.embed)
  const videos = [...readyUploads, ...VIDEOS.filter((v) => !readyUploads.some((u) => String(u.id) === String(v.id)))]

  // Merged Categories
  const categories = [
    ...customCategories,
    ...CATEGORIES.filter((c) => !customCategories.some((cc) => cc.slug === c.slug)),
  ]

  // Merged Models & Creators
  const models = [
    ...customModels,
    ...MODELS.filter((m) => !customModels.some((cm) => cm.id === m.id)),
  ]

  const creators = [
    ...customModels.map((m) => ({
      id: m.id,
      name: m.name,
      verified: m.verified,
      subs: m.subs || '0',
      avatar: m.avatar,
      icon: null,
      grad: m.grad || ['#c62b4a', '#8f1d38'],
      about: m.bio || m.about,
      externalUrl: m.externalUrl,
      externalLabel: m.externalLabel,
      videoCount: m.videoCount || 0,
      views: m.views || 0,
      isModel: true,
    })),
    ...CREATORS.filter((c) => !customModels.some((cm) => cm.id === c.id)),
  ]

  return (
    <Ctx.Provider value={{
      videos,
      serverVideos,
      categories,
      models,
      creators,
      serverOnline,
      ffmpeg,
      loading,
      refresh,
      addCategory,
      deleteCategory,
      addModel,
      deleteModel,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export const useCatalog = () => useContext(Ctx)

