"use server"
import {db} from "@/firebase/admin"
import { NextResponse } from 'next/server';

/**
 * API endpoint to deduct coins from a user's account after an interview.
 * 
 * This function processes requests to deduct coins from a user's account
 * based on the time spent in an interview session. It validates the required
 * fields, updates the user's coin count in Firestore, and returns a success
 * or error response.
 * 
 * @param {Request} request - The HTTP request object containing:
 *   - userId: The ID of the user
 *   - coinCount: The current coin count of the user
 *   - coinCost: The number of coins to deduct
 * @returns {Promise<NextResponse>} JSON response containing:
 *   - Success: { success: true } with status 200
 *   - Error (missing fields): { error: 'Missing required fields' } with status 400
 *   - Error (other): { error: 'Failed to deduct coins' } with status 500
 */
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { userId, coinCount, coinCost } = data;
    
    if (!userId || coinCount === undefined || coinCost === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const userRef = db.collection('users').doc(userId);
    await userRef.update({coinCount: (coinCount-coinCost)});
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error in deductCoins API:", error);
    return NextResponse.json(
      { error: 'Failed to deduct coins' },
      { status: 500 }
    );
  }
}