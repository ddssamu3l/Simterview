import React from 'react'
import Image from 'next/image'
import Link from 'next/link';
// import DisplayTechIcons from './DisplayTechIcons';
import { cn, formatISODate } from '@/lib/utils';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const InterviewCard = ({ id, name, length, difficulty, description, createdAt, questions, type, passed }: InterviewCardProps) => {
  return (
    <div className="card-border hover:bg-dark-300 max-w-86 max-sm:w-full min-h-64 cursor-pointer transition-colors duration-200">
      <Link href={passed!==undefined? `/feedback/${id}` : `/live-interview/${id}`}>
        <div className="card-interview border-b py-4 px-4">
          <div className="flex">
            <div className="relative flex justify-between w-full">
              <p className="badge-text flex items-center text-sm font-medium">
                {(passed != null && passed != undefined) && (
                  passed ? (
                    <Image 
                      src="/check.svg" 
                      alt="Successfully completed interview" 
                      width={16} 
                      height={16} 
                      className="mr-2" 
                    />
                  ) : (
                    <Image 
                      src="/cross.svg" 
                      alt="Interview not yet completed" 
                      width={16} 
                      height={16} 
                      className="mr-2" 
                    />
                  )
                )}
                {difficulty}
              </p>
              <p className="badge-text text-md font-medium">{type}</p>
              <div className="absolute left-1/2 transform -translate-x-1/2 flex gap-1 items-center px-2 py-1 rounded">
                <Image 
                  src="/timer.svg" 
                  alt="Interview duration" 
                  width={14} 
                  height={14} 
                />
                <p className="text-xs text-slate-300">{length}min</p>
              </div>
            </div>
          </div>
        </div>
        <div className="interview-title border-b py-4 px-4 flex flex-col items-center relative">
          <h2 className="text-center text-lg font-semibold text-slate-200">{name}</h2>
          {(passed !== undefined) && (
            <p className="text-xs absolute bottom-2 right-3 text-slate-400">
              Feedback on: {formatISODate(createdAt)}
            </p>
          )}
        </div>
        <div className={cn("interview-description px-4 py-4 text-start justify-center")}>
          <p className="text-sm text-slate-400 line-clamp-3">{description}</p>
        </div>
      </Link>
    </div>
  )
}

export default InterviewCard