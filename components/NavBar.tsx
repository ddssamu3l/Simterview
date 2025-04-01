import Link from 'next/link'
import Image from 'next/image'
import React from 'react'

const NavBar = ({username}: {username: string}) => {
  return (
    <div className="w-full border-b">
      <nav className="flex justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/icon.png"
            alt="logo"
            width={50}
            height={44}
          />
          <h2 className="font-bold max-sm:text-xl">Simterview</h2>
        </Link>
        <h2 className="flex items-center font-bold max-sm:hidden">{username}</h2>
      </nav>
    </div>
  )
}

export default NavBar