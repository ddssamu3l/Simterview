import Link from 'next/link'
import Image from 'next/image'
import React from 'react'

const NavBar = () => {
  return (
    <div className="w-full border-b">
      <nav>
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/icon.png"
            alt="logo"
            width={50}
            height={44}
          />
          <h2 className="font-bold">Simterview</h2>
        </Link>
      </nav>
    </div>
  )
}

export default NavBar