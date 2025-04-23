"use server"
import {db} from "@/firebase/admin"

export async function deductCoins({userId, coinCount, coinCost}: deductCoinProps){
  try{
    const userRef =  db.collection('users').doc(userId);
    await userRef.update({coinCount: (coinCount-coinCost)});

    return {success: true, status: 200};
  }catch(error){
    console.error("Error deducting coins: " + error);
    return{success: false, status: 500};
  }
}