import React from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { formatISODate } from '@/lib/utils'

const UserProfile = ({name, email, coinCount, id, createdAt}: User) => {
  return (
    <div className="w-full mx-auto mb-12">
      <div className="border rounded-lg p-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-8">User Profile</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Profile Info */}
          <div className="space-y-6">
            <div className="h-full">
              <h2 className="text-lg font-semibold mb-2">Profile Information</h2>
              <div className="border rounded-md p-4 h-[calc(100%-38px)] flex flex-col justify-between">
                <div className="space-y-3">
                  <div>
                    <p className="text-slate-400 text-sm">Name</p>
                    <p className="font-medium">{name}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Email</p>
                    <p className="font-medium">{email}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">User ID</p>
                    <p className="font-medium text-sm text-slate-300">{id}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Joined On</p>
                    <p className="font-medium text-sm text-slate-300">{formatISODate(createdAt)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Coin Info */}
          <div className="space-y-6">
            <div className="h-full">
              <h2 className="text-lg font-semibold mb-2">SimCoins</h2>
              <div className="border rounded-md p-4 flex flex-col h-[calc(100%-38px)]">
                <div className="flex items-center gap-3 mb-4">
                  <Image src="/coin.png" alt="SimCoin" width={32} height={32} unoptimized />
                  <div>
                    <p className="text-slate-400 text-sm">Available Balance</p>
                    <p className="font-bold text-xl">{coinCount} SimCoins</p>
                  </div>
                </div>
                <div className="flex-grow flex flex-col justify-between">
                  <p className="text-xs text-slate-400 mb-4">
                    SimCoins are used to access AI interviews
                  </p>
                  <Button className="w-full btn-primary text-black mt-auto">
                    Purchase More
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserProfile