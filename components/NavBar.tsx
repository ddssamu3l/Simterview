import Link from 'next/link'
import Image from 'next/image'
import React from 'react'
import { Button } from './ui/button'

const NavBar = ({username, userId}: {username: string, userId: string}) => {
  const userProfilePath = "/u/"+userId;
  return (
    <div className="w-full border-b h-[7vh]">
      <nav className="flex justify-between">
        <Link href="/" className="flex items-center gap-2 hover: mouse-pointer">
          <Image
            src="/icon.png"
            alt="logo"
            width={50}
            height={44}
            unoptimized
          />
          <h2 className="font-bold max-sm:text-xl">Simterview</h2>
        </Link>
        {(username !== "") 
        ? <Link href={userProfilePath}><h2 className="flex items-center font-bold max-sm:hidden">{username}</h2></Link>
        : <Button className="font-bold sm:w-[120px] hover:mouse-pointer">
            <Link href="/sign-in">
              Sign-In
            </Link>
          </Button>
        }
        
      </nav>
    </div>
  )
}

export default NavBar