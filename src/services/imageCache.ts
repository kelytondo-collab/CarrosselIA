/**
 * IndexedDB image cache — persists slide images across page reloads.
 * No size limits like localStorage. Images stored as base64 strings.
 */

const DB_NAME = 'postativo_images'
const DB_VERSION = 1
const STORE_NAME = 'images'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
  })
}

/**
 * Save an image to IndexedDB
 * @param key — e.g. `${projectId}_slide_${index}` or `${projectId}_post`
 * @param imageData — base64 data URL
 */
export async function saveImage(key: string, imageData: string): Promise<void> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      store.put(imageData, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (err) {
    console.warn('ImageCache: failed to save', key, err)
  }
}

/**
 * Load an image from IndexedDB
 * @returns base64 data URL or null
 */
export async function loadImage(key: string): Promise<string | null> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.get(key)
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  } catch {
    return null
  }
}

/**
 * Load all images for a project
 * @returns Map of key → base64 data URL
 */
export async function loadProjectImages(projectId: string): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.openCursor()
      request.onsuccess = () => {
        const cursor = request.result
        if (cursor) {
          const key = cursor.key as string
          if (key.startsWith(projectId)) {
            result.set(key, cursor.value)
          }
          cursor.continue()
        } else {
          resolve(result)
        }
      }
      request.onerror = () => reject(request.error)
    })
  } catch {
    return result
  }
}

/**
 * Delete an image from IndexedDB
 */
export async function deleteImage(key: string): Promise<void> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      store.delete(key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // silently fail
  }
}

/**
 * Delete all images for a project
 */
export async function deleteProjectImages(projectId: string): Promise<void> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.openCursor()
      request.onsuccess = () => {
        const cursor = request.result
        if (cursor) {
          const key = cursor.key as string
          if (key.startsWith(projectId)) {
            cursor.delete()
          }
          cursor.continue()
        } else {
          resolve()
        }
      }
      request.onerror = () => reject(request.error)
    })
  } catch {
    // silently fail
  }
}

/**
 * Save all slide images for a carousel project
 */
export async function saveCarouselImages(projectId: string, slides: { imageUrl?: string }[]): Promise<void> {
  const promises = slides.map((slide, i) => {
    if (slide.imageUrl) {
      return saveImage(`${projectId}_slide_${i}`, slide.imageUrl)
    }
    return deleteImage(`${projectId}_slide_${i}`)
  })
  await Promise.all(promises)
}

/**
 * Restore slide images from IndexedDB into slide objects
 */
export async function restoreCarouselImages(projectId: string, slides: { imageUrl?: string }[]): Promise<typeof slides> {
  const images = await loadProjectImages(projectId)
  return slides.map((slide, i) => {
    if (slide.imageUrl) return slide // already has image
    const cached = images.get(`${projectId}_slide_${i}`)
    return cached ? { ...slide, imageUrl: cached } : slide
  })
}
