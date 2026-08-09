const DB_NAME = 'pet-doctor-site'
const STORE_NAME = 'site-state'
const WALL_KEY = 'photo-wall'

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function loadPhotoWall() {
  const database = await openDatabase()
  return new Promise((resolve, reject) => {
    const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(WALL_KEY)
    request.onsuccess = () => {
      database.close()
      resolve(request.result ?? null)
    }
    request.onerror = () => {
      database.close()
      reject(request.error)
    }
  })
}

export async function savePhotoWall(photos) {
  const database = await openDatabase()
  return new Promise((resolve, reject) => {
    const request = database.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(photos, WALL_KEY)
    request.onsuccess = () => {
      database.close()
      resolve()
    }
    request.onerror = () => {
      database.close()
      reject(request.error)
    }
  })
}
