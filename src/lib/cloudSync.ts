import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { TradeRecord } from '../types/trade';
import { getCurrentUser, getFirestoreService } from './firebase';
import {
  getAllScreenshots,
  getScreenshot,
  registerCloudScreenshotHandlers,
  saveScreenshot,
} from './screenshotStorage';

interface TradeTombstone {
  id: string;
  deletedAt: number;
}

// Wire up screenshot storage cloud hooks
registerCloudScreenshotHandlers({
  fetch: async (id: string) => {
    const user = getCurrentUser();
    if (user?.uid) {
      return fetchScreenshotFromCloud(user.uid, id);
    }
    return null;
  },
  upload: async (id: string, dataUrl: string) => {
    const user = getCurrentUser();
    if (user?.uid) {
      await uploadScreenshotToCloud(user.uid, id, dataUrl);
    }
  },
  delete: async (id: string) => {
    const user = getCurrentUser();
    if (user?.uid) {
      await deleteScreenshotFromCloud(user.uid, id);
    }
  },
});


export interface CloudSyncState {
  status: 'idle' | 'syncing' | 'synced' | 'error' | 'disabled';
  lastSyncedAt: Date | null;
  errorMessage: string | null;
  remoteTradeCount: number;
}

// Compress data URL if larger than ~700KB to ensure safe Firestore document storage (< 1MB)
async function compressDataUrlIfNeeded(dataUrl: string, maxDimension = 1920): Promise<string> {
  if (dataUrl.length < 750000) {
    return dataUrl;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      // Compress as JPEG
      const compressed = canvas.toDataURL('image/jpeg', 0.85);
      resolve(compressed);
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Uploads a screenshot to the user's Firestore screenshots collection
 */
export async function uploadScreenshotToCloud(
  uid: string,
  imageId: string,
  dataUrl?: string
): Promise<void> {
  const db = getFirestoreService();
  if (!db || !uid || !imageId) return;

  try {
    let sourceDataUrl = dataUrl;
    if (!sourceDataUrl) {
      sourceDataUrl = (await getScreenshot(imageId)) || undefined;
    }
    if (!sourceDataUrl) return;

    const compressed = await compressDataUrlIfNeeded(sourceDataUrl);

    const docRef = doc(db, 'users', uid, 'screenshots', imageId);
    await setDoc(
      docRef,
      {
        id: imageId,
        dataUrl: compressed,
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  } catch (err) {
    console.error(`Failed uploading screenshot ${imageId} to cloud`, err);
  }
}

/**
 * Fetches a screenshot from Firestore for the user and stores it into local IndexedDB
 */
export async function fetchScreenshotFromCloud(
  uid: string,
  imageId: string
): Promise<string | null> {
  const db = getFirestoreService();
  if (!db || !uid || !imageId) return null;

  try {
    const docRef = doc(db, 'users', uid, 'screenshots', imageId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data?.dataUrl) {
        // Cache to local IndexedDB
        await saveScreenshot(imageId, data.dataUrl);
        return data.dataUrl;
      }
    }
  } catch (err) {
    console.error(`Failed fetching screenshot ${imageId} from cloud`, err);
  }
  return null;
}

/**
 * Deletes a screenshot from Firestore
 */
export async function deleteScreenshotFromCloud(uid: string, imageId: string): Promise<void> {
  const db = getFirestoreService();
  if (!db || !uid || !imageId) return;

  try {
    const docRef = doc(db, 'users', uid, 'screenshots', imageId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error(`Failed deleting screenshot ${imageId} from cloud`, err);
  }
}

/**
 * Saves a single trade to Firestore and automatically uploads its screenshots
 */
export async function saveTradeToCloud(user: User, trade: TradeRecord): Promise<void> {
  const db = getFirestoreService();
  if (!db || !user?.uid) return;

  try {
    // Clear any tombstone for this trade ID (e.g., if re-created/imported)
    const tombstoneRef = doc(db, 'users', user.uid, 'deletedTrades', trade.id);
    await deleteDoc(tombstoneRef).catch(() => {});

    const tradeRef = doc(db, 'users', user.uid, 'trades', trade.id);
    await setDoc(tradeRef, trade, { merge: true });

    // Upload screenshots if present
    if (trade.entryImageId) {
      await uploadScreenshotToCloud(user.uid, trade.entryImageId);
    }
    if (trade.exitImageId) {
      await uploadScreenshotToCloud(user.uid, trade.exitImageId);
    }
  } catch (err) {
    console.error(`Failed saving trade ${trade.id} to cloud`, err);
    throw err;
  }
}

/**
 * Deletes a trade from Firestore and cleans up associated screenshot documents
 */
export async function deleteTradeFromCloud(
  user: User,
  tradeId: string,
  entryImageId?: string,
  exitImageId?: string
): Promise<void> {
  const db = getFirestoreService();
  if (!db || !user?.uid) return;

  try {
    // Write tombstone first to prevent resurrection by sync/merge
    const tombstoneRef = doc(db, 'users', user.uid, 'deletedTrades', tradeId);
    await setDoc(
      tombstoneRef,
      {
        id: tradeId,
        deletedAt: Date.now(),
      },
      { merge: true }
    );

    const tradeRef = doc(db, 'users', user.uid, 'trades', tradeId);
    await deleteDoc(tradeRef);

    if (entryImageId) {
      await deleteScreenshotFromCloud(user.uid, entryImageId);
    }
    if (exitImageId) {
      await deleteScreenshotFromCloud(user.uid, exitImageId);
    }
  } catch (err) {
    console.error(`Failed deleting trade ${tradeId} from cloud`, err);
    throw err;
  }
}

/**
 * Performs a comprehensive two-way sync:
 * 1. Pulls all remote trades and deletion tombstones from Firestore.
 * 2. Compares with local trades and merges both directions (tombstones win).
 * 3. Uploads local-only trades & screenshots to Firestore (never tombstoned IDs).
 * 4. Uploads local screenshots for trades in the merged ledger.
 * 5. Returns the consolidated merged list of trades.
 */
export async function performFullSync(
  user: User,
  localTrades: TradeRecord[]
): Promise<TradeRecord[]> {
  const db = getFirestoreService();
  if (!db || !user?.uid) {
    return localTrades;
  }

  // 1. Fetch remote trades and deletion tombstones
  const tradesCol = collection(db, 'users', user.uid, 'trades');
  const deletedCol = collection(db, 'users', user.uid, 'deletedTrades');
  const [querySnap, deletedSnap] = await Promise.all([getDocs(tradesCol), getDocs(deletedCol)]);

  const tombstonedIds = new Set<string>();
  deletedSnap.forEach((docSnap) => {
    const data = docSnap.data() as Partial<TradeTombstone>;
    const id = data?.id || docSnap.id;
    if (id) {
      tombstonedIds.add(id);
    }
  });

  const remoteTradesMap = new Map<string, TradeRecord>();
  querySnap.forEach((docSnap) => {
    const data = docSnap.data() as TradeRecord;
    if (data && data.id && !tombstonedIds.has(data.id)) {
      remoteTradesMap.set(data.id, data);
    }
  });

  const localTradesMap = new Map<string, TradeRecord>(
    localTrades.filter((t) => t?.id && !tombstonedIds.has(t.id)).map((t) => [t.id, t])
  );
  const mergedMap = new Map<string, TradeRecord>();
  const tradesToUpload: TradeRecord[] = [];

  // Merge remote trades into map
  remoteTradesMap.forEach((remoteTrade, id) => {
    const localTrade = localTradesMap.get(id);
    if (!localTrade) {
      // Exists only remotely -> keep remote
      mergedMap.set(id, remoteTrade);
    } else {
      // Exists in both -> prefer local if it's more complete, otherwise keep remote
      const remoteTime = new Date(remoteTrade.createdAt).getTime();
      const localTime = new Date(localTrade.createdAt).getTime();
      const isLocalMoreComplete =
        (localTrade.status === 'CLOSED' && remoteTrade.status === 'OPEN') ||
        (localTrade.exits?.length || 0) > (remoteTrade.exits?.length || 0);

      if (isLocalMoreComplete || localTime > remoteTime) {
        mergedMap.set(id, localTrade);
        tradesToUpload.push(localTrade);
      } else {
        mergedMap.set(id, remoteTrade);
      }
    }
  });

  // Check local-only trades -> upload to remote (never tombstoned)
  localTradesMap.forEach((localTrade, id) => {
    if (!remoteTradesMap.has(id) && !tombstonedIds.has(id)) {
      mergedMap.set(id, localTrade);
      tradesToUpload.push(localTrade);
    }
  });

  // 2. Upload any local trades that need to be sent to Firestore
  for (const trade of tradesToUpload) {
    if (tombstonedIds.has(trade.id)) continue;
    try {
      await setDoc(doc(db, 'users', user.uid, 'trades', trade.id), trade, { merge: true });
    } catch (e) {
      console.warn(`Error uploading trade ${trade.id} during sync`, e);
    }
  }

  // 3. Sync screenshots (best-effort)
  const allLocalScreenshots = await getAllScreenshots();
  for (const trade of mergedMap.values()) {
    if (trade.entryImageId && allLocalScreenshots[trade.entryImageId]) {
      uploadScreenshotToCloud(user.uid, trade.entryImageId, allLocalScreenshots[trade.entryImageId]).catch(
        () => {}
      );
    }
    if (trade.exitImageId && allLocalScreenshots[trade.exitImageId]) {
      uploadScreenshotToCloud(user.uid, trade.exitImageId, allLocalScreenshots[trade.exitImageId]).catch(
        () => {}
      );
    }
  }

  // Convert to array sorted by createdAt descending
  const mergedList = Array.from(mergedMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return mergedList;
}

/**
 * Subscribes to real-time changes on the user's remote trades collection.
 * Fetches the deletedTrades tombstone list on each snapshot to prevent
 * deleted trades from being resurrected by the real-time listener.
 */
export function subscribeToTrades(
  user: User,
  onRemoteUpdate: (trades: TradeRecord[]) => void
): Unsubscribe | null {
  const db = getFirestoreService();
  if (!db || !user?.uid) return null;

  const tradesCol = collection(db, 'users', user.uid, 'trades');
  const deletedCol = collection(db, 'users', user.uid, 'deletedTrades');

  return onSnapshot(
    tradesCol,
    async (snapshot) => {
      // Fetch current tombstones so we never surface a deleted trade
      let tombstonedIds = new Set<string>();
      try {
        const deletedSnap = await getDocs(deletedCol);
        deletedSnap.forEach((docSnap) => {
          const data = docSnap.data() as Partial<TradeTombstone>;
          const id = data?.id || docSnap.id;
          if (id) tombstonedIds.add(id);
        });
      } catch {
        // If tombstone fetch fails, proceed without it (safe – worst case a
        // deleted trade flickers back; the next snapshot will correct it).
      }

      const trades: TradeRecord[] = [];
      snapshot.forEach((doc) => {
        const item = doc.data() as TradeRecord;
        if (item && item.id && !tombstonedIds.has(item.id)) {
          trades.push(item);
        }
      });
      trades.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onRemoteUpdate(trades);
    },
    (error) => {
      console.error('Remote trades snapshot error:', error);
    }
  );
}
