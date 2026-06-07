import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Check if any required variables are missing
const isConfigured = !!firebaseConfig.apiKey && firebaseConfig.apiKey !== 'your-api-key';

if (!isConfigured) {
  console.warn(
    'Firebase environment variables are not yet fully configured in your .env / .env.local file. ' +
    'Please make sure to set VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID, etc. for authentications to work.'
  );
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
