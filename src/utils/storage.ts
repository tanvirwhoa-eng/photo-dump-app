import { ProjectState, UploadedPhoto } from '../types/studio';

const DB_NAME = 'panoframe_studio_db';
const DB_VERSION = 1;
const STORE_NAME = 'studio_kv';
const PROJECT_KEY = 'active_project_v1';
const UPLOADS_KEY = 'uploaded_photos_v1';
const THEME_KEY = 'panoframe_theme';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet<T>(key: string): Promise<T | null> {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }
}

async function idbSet<T>(key: string, value: T): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore quota exceeded on fallback
    }
  }
}

export async function saveProjectToStorage(project: ProjectState): Promise<void> {
  await idbSet(PROJECT_KEY, project);
}

export async function loadProjectFromStorage(): Promise<ProjectState | null> {
  return await idbGet<ProjectState>(PROJECT_KEY);
}

export async function saveUploadedPhotos(photos: UploadedPhoto[]): Promise<void> {
  await idbSet(UPLOADS_KEY, photos);
}

export async function loadUploadedPhotos(): Promise<UploadedPhoto[]> {
  return (await idbGet<UploadedPhoto[]>(UPLOADS_KEY)) ?? [];
}

export function getSavedTheme(): 'dark' | 'light' {
  try {
    const val = localStorage.getItem(THEME_KEY);
    return val === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function saveTheme(theme: 'dark' | 'light'): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Ignore storage error
  }
}
