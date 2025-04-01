// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDChRS-BCZeYzo8Cap1pHjtXBuZChUiiQ0",
  authDomain: "simterview-ff1ca.firebaseapp.com",
  projectId: "simterview-ff1ca",
  storageBucket: "simterview-ff1ca.firebasestorage.app",
  messagingSenderId: "883416081360",
  appId: "1:883416081360:web:4a4769df6f2181c3b24fd5",
  measurementId: "G-9023ZLTJQ9"
};

// Initialize Firebase properly
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);