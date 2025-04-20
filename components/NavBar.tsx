import Link from 'next/link'
import Image from 'next/image'
import React from 'react'
import { Button } from './ui/button'

const NavBar = ({ username, userId }: { username: string, userId: string }) => {
  const userProfilePath = "/u/" + userId;

  return (
    <header className="w-full border-b">
      <div className="max-w-6xl mx-auto px-4">
        <nav className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2 hover:opacity-90">
            <Image
              src="/icon.png"
              alt="logo"
              width={40}
              height={40}
              unoptimized
            />
            <h2 className="font-bold text-xl">Simterview</h2>
          </Link>

          <div className="flex items-center gap-6">
            <Link href="/custom-interview" className="text-slate-300" >
              Custom Interview
            </Link>
            <Link href="/interview-list" className="text-slate-300">
              Interview List
            </Link>
            <Link href="mailto:rainsongsoftware@gmail.com" className="text-slate-300">
              Support
            </Link>
            {(username !== "")
              ? (
                <Link href={userProfilePath} className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                    <span className="text-sm font-bold">{username.charAt(0).toUpperCase()}</span>
                  </div>
                  <span className="font-medium max-sm:hidden">{username}</span>
                </Link>
              )
              : (
                <Button className="font-bold">
                  <Link href="/sign-in">
                    Sign In
                  </Link>
                </Button>
              )
            }
          </div>
        </nav>
      </div>
    </header>
  )
}

export default NavBar