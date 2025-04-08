import NavBar from '@/components/NavBar'
import { getCurrentUser } from '@/lib/actions/auth.action';
import React, { ReactNode } from 'react'

const RootLayout = async ({children}: {children: ReactNode}) => {
  const currentUser = await getCurrentUser();
  const username = currentUser? currentUser.name : ""
  const userId = currentUser? currentUser.id : ""
  return (
    <div className="root-layout">
      <NavBar username={username} userId={userId}/>
      {children}
    </div>
  )
}

export default RootLayout