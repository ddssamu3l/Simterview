import NavBar from '@/components/NavBar'
import { getCurrentUser } from '@/lib/actions/auth.action';
import React, { ReactNode } from 'react'

const RootLayout = async ({children}: {children: ReactNode}) => {
  const currentUser = await getCurrentUser();
  const username = currentUser? currentUser.name : ""
  const userId = currentUser? currentUser.id : ""
  const coinCount = currentUser? currentUser.coinCount : 0
  return (
    <div className="root-layout">
      <NavBar username={username} userId={userId} coinCount={coinCount}/>
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  )
}

export default RootLayout