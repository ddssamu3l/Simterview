/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * CommonJS version of Firebase Admin for Node.js scripts
 */
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

/**
 * Initializes Firebase Admin SDK for server-side operations.
 * CommonJS version for Node.js scripts.
 */
const initFirebaseAdmin = () => {
  const app = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    })
  });

  return {
    auth: getAuth(app),
    db: getFirestore(app),
  };
};

const { auth, db } = initFirebaseAdmin();

module.exports = { auth, db };