import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore'

/**
 * Initializes Firebase Admin SDK for server-side operations.
 * 
 * This function initializes the Firebase Admin SDK with the project credentials
 * from environment variables if an app instance doesn't already exist.
 * It ensures only one instance of the Firebase Admin app is created.
 * 
 * The function handles the proper formatting of the private key by replacing
 * escaped newlines with actual newlines.
 * 
 * @returns {Object} An object containing:
 *   - auth: Firebase Auth Admin instance for authentication operations
 *   - db: Firestore Admin instance for database operations
 */
const initFirebaseAdmin = () => {
  const apps = getApps();

  if (!apps.length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      })
    })
  }

  return {
    auth: getAuth(),
    db: getFirestore(),
  }
}

export const { auth, db } = initFirebaseAdmin();