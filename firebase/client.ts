// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * Firebase client configuration for web application.
 * 
 * This object contains the necessary configuration parameters to initialize
 * Firebase client SDK for browser-based operations.
 */
const firebaseConfig = {
  apiKey: "AIzaSyDChRS-BCZeYzo8Cap1pHjtXBuZChUiiQ0",
  authDomain: "simterview-ff1ca.firebaseapp.com",
  projectId: "simterview-ff1ca",
  storageBucket: "simterview-ff1ca.firebasestorage.app",
  messagingSenderId: "883416081360",
  appId: "1:883416081360:web:4a4769df6f2181c3b24fd5",
  measurementId: "G-9023ZLTJQ9"
};

/**
 * Initializes the Firebase client application.
 * 
 * This code ensures only one instance of the Firebase app is created by
 * checking if one already exists before initializing a new one.
 */
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

/**
 * Firebase Authentication instance for client-side auth operations.
 */
export const auth = getAuth(app);

/**
 * Firestore database instance for client-side database operations.
 */
export const db = getFirestore(app);