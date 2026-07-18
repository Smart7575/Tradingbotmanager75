import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: ((import.meta as any).env?.VITE_FIREBASE_API_KEY as string) || "AIzaSyAP6t5SW7pIAgEQ2dlKh67nee6khUxKaXk",
  authDomain: ((import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN as string) || "tradingbotmanager75.firebaseapp.com",
  projectId: ((import.meta as any).env?.VITE_FIREBASE_PROJECT_ID as string) || "tradingbotmanager75",
  storageBucket: ((import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET as string) || "tradingbotmanager75.firebasestorage.app",
  messagingSenderId: ((import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || "327545877828",
  appId: ((import.meta as any).env?.VITE_FIREBASE_APP_ID as string) || "1:327545877828:web:8bd3256427f412977a1311"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

