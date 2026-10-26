import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  User,
  Auth,
} from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
}

/**
 * ============================================================================
 * EMBEDDED FIREBASE CONFIGURATION FOR VIPER TD LOGGER
 * ============================================================================
 * You can paste your Firebase Web App credentials below directly, OR place
 * them in .env.local (which is automatically loaded by Vite).
 */
export const EMBEDDED_FIREBASE_CONFIG: FirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyC6XYiUMJ8_VwHadduR8YWvIZRgESybeHw',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'viper-td-logger.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'viper-td-logger',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'viper-td-logger.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '950687159055',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:950687159055:web:78bfd03682537197b6647a',
};

const STORAGE_KEY_CONFIG = 'trade_logger_firebase_config';

/**
 * Retrieves the active Firebase configuration:
 * 1. Embedded config (from EMBEDDED_FIREBASE_CONFIG or .env / .env.local)
 * 2. Fallback to localStorage if previously configured
 */
export function getFirebaseConfig(): FirebaseConfig | null {
  // Check embedded / env config first
  if (
    EMBEDDED_FIREBASE_CONFIG.apiKey &&
    EMBEDDED_FIREBASE_CONFIG.apiKey !== 'YOUR_FIREBASE_API_KEY' &&
    EMBEDDED_FIREBASE_CONFIG.projectId
  ) {
    return EMBEDDED_FIREBASE_CONFIG;
  }

  // Fallback to localStorage if user stored custom config
  try {
    const custom = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (custom) {
      const parsed = JSON.parse(custom);
      if (parsed.apiKey && parsed.projectId) {
        return parsed as FirebaseConfig;
      }
    }
  } catch (err) {
    console.warn('Failed reading Firebase config from storage', err);
  }

  return null;
}

export function saveFirebaseConfig(config: FirebaseConfig): void {
  localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
  initFirebase();
}

export function clearFirebaseConfig(): void {
  localStorage.removeItem(STORAGE_KEY_CONFIG);
}

export function isFirebaseConfigured(): boolean {
  const config = getFirebaseConfig();
  return Boolean(
    config &&
      config.apiKey &&
      config.apiKey.length > 5 &&
      config.apiKey !== 'YOUR_FIREBASE_API_KEY' &&
      config.projectId
  );
}

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let firestoreDb: Firestore | null = null;

export interface RememberedLogin {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  uid: string;
  lastLoginAt: number;
}

const STORAGE_KEY_LAST_LOGIN = 'viper_td_logger_last_login';

export function getRememberedLogin(): RememberedLogin | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LAST_LOGIN);
    if (!raw) return null;
    return JSON.parse(raw) as RememberedLogin;
  } catch {
    return null;
  }
}

export function saveRememberedLogin(user: User): void {
  const data: RememberedLogin = {
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
    uid: user.uid,
    lastLoginAt: Date.now(),
  };
  localStorage.setItem(STORAGE_KEY_LAST_LOGIN, JSON.stringify(data));
}

export function clearRememberedLogin(): void {
  localStorage.removeItem(STORAGE_KEY_LAST_LOGIN);
}

export function initFirebase(): { app: FirebaseApp; auth: Auth; db: Firestore } | null {
  const config = getFirebaseConfig();
  if (!config || !isFirebaseConfigured()) {
    return null;
  }

  try {
    if (getApps().length === 0) {
      firebaseApp = initializeApp(config);
    } else {
      firebaseApp = getApp();
    }

    firebaseAuth = getAuth(firebaseApp);
    firestoreDb = getFirestore(firebaseApp);

    // Explicitly guarantee browser local persistence
    setPersistence(firebaseAuth, browserLocalPersistence).catch((err) => {
      console.warn('Could not enforce browserLocalPersistence', err);
    });

    return {
      app: firebaseApp,
      auth: firebaseAuth,
      db: firestoreDb,
    };
  } catch (err) {
    console.error('Failed to initialize Firebase:', err);
    return null;
  }
}

export function getAuthService(): Auth | null {
  if (!firebaseAuth) {
    initFirebase();
  }
  return firebaseAuth;
}

export function getFirestoreService(): Firestore | null {
  if (!firestoreDb) {
    initFirebase();
  }
  return firestoreDb;
}

/**
 * Initiates Google OAuth sign-in via popup
 */
export async function signInWithGoogle(): Promise<User> {
  const auth = getAuthService();
  if (!auth) {
    throw new Error(
      'Firebase credentials not found. Please embed your Firebase project keys in src/lib/firebase.ts or .env.local.'
    );
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: 'select_account',
  });

  try {
    const result = await signInWithPopup(auth, provider);
    saveRememberedLogin(result.user);
    return result.user;
  } catch (error: any) {
    if (error.code === 'auth/unauthorized-domain') {
      const currentDomain = window.location.hostname;
      throw new Error(
        `Domain "${currentDomain}" is not authorized in your Firebase Console. Go to Authentication > Settings > Authorized domains and add "${currentDomain}".`
      );
    }
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('Sign-in cancelled. Popup was closed before completing login.');
    }
    throw error;
  }
}

/**
 * Signs the user out of Firebase
 */
export async function signOutUser(): Promise<void> {
  const auth = getAuthService();
  if (auth) {
    await signOut(auth);
    clearRememberedLogin();
  }
}

/**
 * Listens to authentication state transitions
 */
export function onAuthChange(callback: (user: User | null) => void): () => void {
  const auth = getAuthService();
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

/**
 * Returns current authenticated Firebase user or null
 */
export function getCurrentUser(): User | null {
  const auth = getAuthService();
  return auth?.currentUser || null;
}
