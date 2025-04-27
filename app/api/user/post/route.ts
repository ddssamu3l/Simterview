"use server"
import {db} from "@/firebase/admin"
import { NextResponse } from 'next/server';

// Server action for direct import
export async function deductCoins({userId, coinCount, coinCost}: deductCoinProps){
  try{
    const userRef = db.collection('users').doc(userId);
    await userRef.update({coinCount: (coinCount-coinCost)});

    return {success: true, status: 200};
  }catch(error){
    console.error("Error deducting coins: " + error);
    return{success: false, status: 500};
  }
}

// API route handler for fetch calls
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