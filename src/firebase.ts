import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const isConfigured = 
  !!firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== 'YOUR_ACTUAL_API_KEY_HERE' &&
  firebaseConfig.apiKey !== 'your-api-key';

let app;
let auth: any = null;
let db: any = null;

if (isConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
  }
} else {
  console.warn(
    'Firebase environment variables are missing or default placeholders are still in place. ' +
    'Authentication and database features will not work until variables are configured.'
  );
}

export { auth, db };
export default app;
