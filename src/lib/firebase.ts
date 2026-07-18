import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA2P-CvUb8-I-TcKZZqTuSXT7acv0VikfY",
  authDomain: "bookforge75.firebaseapp.com",
  projectId: "bookforge75",
  storageBucket: "bookforge75.firebasestorage.app",
  messagingSenderId: "968937463207",
  appId: "1:968937463207:web:c66286da46a8b7036d2a82"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

