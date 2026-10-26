const DB_NAME = 'TradeLoggerDB';
const DB_VERSION = 1;
const STORE_NAME = 'screenshots';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this browser environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error ?? new Error('Failed to open IndexedDB'));
    };
  });
}

// Cloud hook delegates
let cloudResolver: ((id: string) => Promise<string | null>) | null = null;
let cloudUploader: ((id: string, dataUrl: string) => Promise<void>) | null = null;
let cloudDeleter: ((id: string) => Promise<void>) | null = null;

export function registerCloudScreenshotHandlers(handlers: {
  fetch: (id: string) => Promise<string | null>;
  upload?: (id: string, dataUrl: string) => Promise<void>;
  delete?: (id: string) => Promise<void>;
}) {
  cloudResolver = handlers.fetch;
  if (handlers.upload) cloudUploader = handlers.upload;
  if (handlers.delete) cloudDeleter = handlers.delete;
}

export async function saveScreenshot(id: string, dataUrl: string): Promise<string> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record = { id, dataUrl, updatedAt: Date.now() };
      const req = store.put(record);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error ?? new Error('Failed to save screenshot'));
    });
  } catch (error) {
    console.warn('IndexedDB write error, falling back to session storage', error);
    try {
      sessionStorage.setItem(`trade_img_${id}`, dataUrl);
    } catch {
      // ignore
    }
  }

  // Asynchronously trigger cloud upload if configured
  if (cloudUploader) {
    cloudUploader(id, dataUrl).catch((err) => {
      console.warn('Background cloud screenshot upload failed', err);
    });
  }

  return id;
}

export async function getScreenshot(id: string): Promise<string | null> {
  if (!id) return null;
  let localResult: string | null = null;

  try {
    const db = await openDatabase();
    localResult = await new Promise<string | null>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);

      req.onsuccess = () => {
        if (req.result && req.result.dataUrl) {
          resolve(req.result.dataUrl);
        } else {
          const fallback = sessionStorage.getItem(`trade_img_${id}`);
          resolve(fallback || null);
        }
      };

      req.onerror = () => {
        const fallback = sessionStorage.getItem(`trade_img_${id}`);
        resolve(fallback || null);
      };
    });
  } catch {
    const fallback = sessionStorage.getItem(`trade_img_${id}`);
    localResult = fallback || null;
  }

  if (localResult) {
    return localResult;
  }

  // If missing locally and cloud resolver exists, query cloud and cache locally
  if (cloudResolver) {
    try {
      const remoteResult = await cloudResolver(id);
      if (remoteResult) {
        return remoteResult;
      }
    } catch {
      // ignore cloud fetch errors
    }
  }

  return null;
}

export async function deleteScreenshot(id: string): Promise<void> {
  if (!id) return;
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to delete screenshot from IndexedDB', err);
  }
  try {
    sessionStorage.removeItem(`trade_img_${id}`);
  } catch {
    // ignore
  }

  if (cloudDeleter) {
    cloudDeleter(id).catch((err) => {
      console.warn('Background cloud screenshot delete failed', err);
    });
  }
}

export async function getAllScreenshots(): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.openCursor();

      req.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          result[cursor.value.id] = cursor.value.dataUrl;
          cursor.continue();
        } else {
          resolve(result);
        }
      };

      req.onerror = () => resolve(result);
    });
  } catch {
    return result;
  }
}

export async function bulkSaveScreenshots(map: Record<string, string>): Promise<void> {
  const keys = Object.keys(map);
  if (keys.length === 0) return;

  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      keys.forEach((key) => {
        store.put({ id: key, dataUrl: map[key], updatedAt: Date.now() });
      });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed bulk saving screenshots', err);
  }
}

