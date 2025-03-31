import NavBar from '@/components/NavBar'
import React, { ReactNode } from 'react'

const RootLayout = ({children}: {children: ReactNode}) => {
  return (
    <div className="root-layout">
      <NavBar />
      {children}
    </div>
  )
}

export default RootLayout