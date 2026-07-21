import { initializeApp, getApps, getApp } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import type { Auth, UserCredential } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';

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

export function getFirebaseFirestore(config: {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}) {
  const app = initFirebase(config);
  return getFirestore(app);
}

// Timeout helper to prevent hanging on Firestore operations when offline/unconfigured
export function withTimeout<T>(promise: Promise<T>, timeoutMs = 4000, errorMsg = 'Operation timed out.'): Promise<T> {
  let timeoutId: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(errorMsg));
    }, timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

export async function saveOtpToFirestore(
  config: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket?: string;
    messagingSenderId?: string;
    appId?: string;
  },
  email: string,
  otpCode: string,
  displayName: string
): Promise<void> {
  const db = getFirebaseFirestore(config);
  const docRef = doc(db, 'otps', email.trim().toLowerCase());
  await setDoc(docRef, {
    code: otpCode,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes from now
    displayName: displayName.trim()
  });
}

export async function verifyOtpInFirestore(
  config: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket?: string;
    messagingSenderId?: string;
    appId?: string;
  },
  email: string,
  enteredCode: string
): Promise<{ displayName: string; email: string }> {
  const db = getFirebaseFirestore(config);
  const docRef = doc(db, 'otps', email.trim().toLowerCase());
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    throw new Error('No active verification request found for this email. Please request a new OTP.');
  }

  const data = docSnap.data();
  if (Date.now() > data.expiresAt) {
    await deleteDoc(docRef);
    throw new Error('Verification code has expired. Please request a new OTP.');
  }

  if (data.code !== enteredCode.trim()) {
    throw new Error('Invalid verification code. Please check the code and try again.');
  }

  // Success: Clean up document
  await deleteDoc(docRef);
  return {
    displayName: data.displayName,
    email: email.trim().toLowerCase()
  };
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

export async function sendFirebaseSignInLink(
  config: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket?: string;
    messagingSenderId?: string;
    appId?: string;
  },
  email: string
): Promise<void> {
  const auth = getFirebaseAuth(config);
  const actionCodeSettings = {
    url: window.location.origin + window.location.pathname,
    handleCodeInApp: true,
  };
  await sendSignInLinkToEmail(auth, email.trim().toLowerCase(), actionCodeSettings);
}

export function isFirebaseEmailLink(
  config: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket?: string;
    messagingSenderId?: string;
    appId?: string;
  },
  link: string
): boolean {
  const auth = getFirebaseAuth(config);
  return isSignInWithEmailLink(auth, link);
}

export async function signInWithFirebaseEmailLink(
  config: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket?: string;
    messagingSenderId?: string;
    appId?: string;
  },
  email: string,
  link: string
): Promise<UserCredential> {
  const auth = getFirebaseAuth(config);
  return signInWithEmailLink(auth, email.trim().toLowerCase(), link);
}

export async function createFirebaseUserWithEmailAndPassword(
  config: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket?: string;
    messagingSenderId?: string;
    appId?: string;
  },
  email: string,
  password: string,
  displayName?: string
): Promise<UserCredential> {
  const auth = getFirebaseAuth(config);
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (displayName && credential.user) {
    await updateProfile(credential.user, { displayName: displayName.trim() });
  }
  return credential;
}

export async function signInWithFirebaseEmailAndPassword(
  config: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket?: string;
    messagingSenderId?: string;
    appId?: string;
  },
  email: string,
  password: string
): Promise<UserCredential> {
  const auth = getFirebaseAuth(config);
  return signInWithEmailAndPassword(auth, email.trim(), password);
}
