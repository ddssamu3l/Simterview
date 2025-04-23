'use server';

import { db, auth } from "@/firebase/admin";
import { cookies } from "next/headers";

const ONE_WEEK = 60 * 60 * 24 * 7

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

export async function isAuthenticated(){
  const user = await getCurrentUser();
  return !!user;
}