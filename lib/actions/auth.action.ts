'use server';

import { db, auth } from "@/firebase/admin";
import { cookies } from "next/headers";

/**
 * Duration of one week in seconds.
 * 
 * Used to set expiration time for session cookies.
 * Calculated as: 60 (seconds) * 60 (minutes) * 24 (hours) * 7 (days)
 * 
 * @type {number}
 */
const ONE_WEEK = 60 * 60 * 24 * 7

/**
 * Handles GitHub authentication and user creation in Firestore.
 * 
 * This function verifies an ID token from GitHub authentication, creates a user
 * record in Firestore if one doesn't exist, and sets a session cookie for the user.
 * 
 * @param {string} idToken - The Firebase ID token obtained from GitHub auth
 * @returns {Promise<{success: boolean, message: string}>} Authentication result
 */
export async function handleGitHubAuth(idToken: string) {
  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // Get the user record from Firebase Auth
    const userRecord = await auth.getUser(uid);

    // Check if we need to create a user in Firestore
    const userDocSnapshot = await db.collection('users').doc(uid).get();

    if (!userDocSnapshot.exists) {
      await db.collection('users').doc(uid).set({
        email: userRecord.email,
        name: userRecord.displayName || userRecord.email,
        createdAt: new Date().toISOString(),
        authProvider: 'github',
        coinCount: 200,
      });
    }

    // Set the session cookie
    await setSessionCookie(idToken);

    return {
      success: true,
      message: "GitHub authentication succeeded"
    };
  } catch (error) {
    console.error("Error handling GitHub auth:", error);
    return {
      success: false,
      message: "Failed to authenticate with GitHub"
    };
  }
}

/**
 * Creates a new user account in Firestore.
 * 
 * This function checks if a user with the given UID already exists, and if not,
 * creates a new user record in Firestore with the provided information.
 * 
 * @param {SignUpParams} params - Object containing user signup parameters
 *   - uid: The Firebase Auth UID for the new user
 *   - name: The display name for the new user
 *   - email: The email address for the new user
 * @returns {Promise<{success: boolean, message: string}>} Account creation result
 */
export async function signUp(params: SignUpParams){
  const {uid, name, email} = params;

  try{
    // try and get a user account from the database with a specific id
    const userRecord = await db.collection('users').doc(uid).get();
    // if that user record exists, it means an account has already been created with that id
    if(userRecord.exists){
      return {
        success: false,
        message: "An account with this email has already been created. Please sign in instead."
      }
    }

    await db.collection('users').doc(uid).set({
      name, 
      email,
      createdAt: new Date().toISOString(),
      authProvider: 'email',
      coinCount: 200,
    })

    return{
      success: true,
      message: "Account created successfully. Please sign in."
    }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }catch(error: any){
    console.error("Error with signup: " + error);

    if(error.code === 'auth/email-already-exists'){
      return {
        success: false,
        message: 'An account has already been created with this email.'
      }
    }

    return{
      success: false,
      message: "Failed to create an account.",
    }
  }
}

/**
 * Signs in a user with email and ID token.
 * 
 * This function verifies that a user with the provided email exists in Firebase Auth,
 * and if so, sets a session cookie for the user using the provided ID token.
 * 
 * @param {SignInParams} params - Object containing sign-in parameters
 *   - email: The email address of the user trying to sign in
 *   - idToken: The Firebase ID token to use for authentication
 * @returns {Promise<{success: boolean, message: string} | undefined>} 
 *   Authentication result, or undefined on success
 */
export async function signIn(params: SignInParams){
  const {email, idToken} = params;

  try{
    const userRecord = await auth.getUserByEmail(email);

    // check if there is an account with the email that the user entered. If not, show error.
    if(!userRecord){
      return{
        success: false,
        message: 'User does not exist. Create an account instead.'
      }
    }

    await setSessionCookie(idToken);
  }catch(error){
    console.error("Error with sign in: " + error)

    return{
      success: false,
      message: 'Failed to log into an account',
    }
  }
}

/**
 * Creates and sets a session cookie for authenticated users.
 * 
 * This function creates a secure session cookie using Firebase Auth and sets it
 * in the browser with appropriate security settings.
 * 
 * @param {string} idToken - The Firebase ID token to use for creating the session
 * @returns {Promise<void>}
 */
export async function setSessionCookie(idToken: string){
  const cookieStore = await cookies();

  const sessionCookie = await auth.createSessionCookie(idToken, {
    expiresIn: ONE_WEEK * 1000, // one week
  });

  cookieStore.set('session', sessionCookie, {
    maxAge: ONE_WEEK,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    sameSite: 'lax',
  })
}

/**
 * Retrieves the currently authenticated user from the session cookie.
 * 
 * This function verifies the session cookie, retrieves the user record from Firestore,
 * and returns the user data if the user is authenticated and exists.
 * 
 * @returns {Promise<User | null>} The authenticated user object or null if not authenticated
 */
export async function getCurrentUser(): Promise<User | null>{
  const cookieStore = await cookies();

  const sessionCookie = cookieStore.get('session')?.value;

  if(!sessionCookie) return null;

  try{
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);

    const userRecord = await db.collection('users').doc(decodedClaims.uid).get();

    if(!userRecord.exists){
      return null;
    }

    return{
      ... userRecord.data(),
      id: userRecord.id,
    } as User;
  }catch(error){
    console.error(error);
    return null;
  }
}

/**
 * Checks if the current user is authenticated.
 * 
 * This is a convenience function that attempts to get the current user
 * and returns a boolean indicating whether a user is authenticated.
 * 
 * @returns {Promise<boolean>} True if the user is authenticated, false otherwise
 */
export async function isAuthenticated(){
  const user = await getCurrentUser();
  return !!user;
}