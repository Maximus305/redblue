import { initializeApp, getApps } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth, connectAuthEmulator } from "firebase/auth";

// Validate required environment variables
const requiredEnvVars = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check for missing required variables
const missingVars = Object.entries(requiredEnvVars)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  throw new Error(
    `Missing required Firebase environment variables: ${missingVars.join(', ')}\n` +
    'Please check your .env.local file and restart the dev server.'
  );
}

const firebaseConfig = {
    apiKey: requiredEnvVars.apiKey!,
    authDomain: requiredEnvVars.authDomain!,
    projectId: requiredEnvVars.projectId!,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: requiredEnvVars.appId!,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Debug: Check if config is loaded
if (typeof window !== 'undefined') {
  console.log('🔥 Firebase config loaded:', {
    hasApiKey: !!firebaseConfig.apiKey,
    hasProjectId: !!firebaseConfig.projectId,
    projectId: firebaseConfig.projectId
  });
}

// Prevent duplicate app initialization
const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);

const db = getFirestore(app);
const auth = getAuth(app);

// Validate db is initialized
if (!db) {
  throw new Error('Failed to initialize Firestore. Check Firebase configuration.');
}

// Debug: Check if db is initialized
if (typeof window !== 'undefined') {
  console.log('🔥 Firestore initialized:', !!db, db);
}

// Wire emulators (must happen before any Firestore/Auth calls)
if (process.env.NEXT_PUBLIC_USE_EMULATORS === "true") {
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  console.log("🔧 Firebase emulators connected");
}

// Debug logging in development (disabled - too verbose)
// if (process.env.NODE_ENV !== "production") {
//   setLogLevel("debug");
// }

export { app, db, auth };
export default app;
