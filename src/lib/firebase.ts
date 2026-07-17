import { initializeApp, getApps, getApp } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import type { Auth, UserCredential } from 'firebase/auth';

// Dynamic Firebase Initializer that prevents multiple initialization errors
export function initFirebase(config: {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}): FirebaseApp {
  if (getApps().length > 0) {
    return getApp();
  }
  return initializeApp(config);
}

export function getFirebaseAuth(config: {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}): Auth {
  const app = initFirebase(config);
  return getAuth(app);
}

export async function signInWithGoogle(config: {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}): Promise<UserCredential> {
  const auth = getFirebaseAuth(config);
  const provider = new GoogleAuthProvider();
  // Always prompt for account selection
  provider.setCustomParameters({
    prompt: 'select_account'
  });
  return signInWithPopup(auth, provider);
}

export async function signOutFirebase(config: {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}): Promise<void> {
  const auth = getFirebaseAuth(config);
  return signOut(auth);
}
