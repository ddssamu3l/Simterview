import React from 'react'
import dayjs from 'dayjs';
import Image from 'next/image'
import Link from 'next/link';
import { Button } from './ui/button';
import DisplayTechIcons from './DisplayTechIcons';
import { cn } from '@/lib/utils';

const InterviewCard = ({id, name, length, difficulty, description, createdAt, questions, techStack, type, finalized, pass}: InterviewCardProps) => {
  const feedback = null as Feedback null;
  const formattedDate = dayjs(feedback?.createdAt || createdAt || Date.now()).format('MMM D, YYYY');
  
  return (
    <div className="card-border w-[360px] max-sm:w-full min-h-64">
      <Link href={(pass != null && pass != undefined)
        ? `/interview/${id}/feedback`
        : `/interview/${id}`
      }>
        <div className="card-interview border-b">
          <div className="flex">
            <div className="relative flex justify-between w-full">
              <p className="badge-text flex">
                {(pass != null && pass != undefined) && (
                  pass ? (
                    <Image src="/check.svg" alt="checkmark" width={15} height={15} className="mr-4" />
                  ) : (
                    <Image src="/cross.svg" alt="crossmark" width={15} height={15} className="mr-4" />
                  )
                )}
                {difficulty}
              </p>
              <p className="badge-text">{type}</p>
              <div className="absolute left-1/2 transform -translate-x-1/2 flex gap-1 items-center">
                <Image src="/timer.svg" alt="duration icon" width={16} height={16} />
                <p className="text-sm text-slate-400">{length}min</p>
              </div>
            </div>
          </div>
        </div>
        <div className="interview-title border-b flex flex-col items-center relative">
          <h2 className="text-center">{name}</h2>
          {(pass != null) && (
            <p className="text-xs font-semibold absolute bottom-1 right-1 text-slate-400">
              Feedback available
            </p>
          )}
        </div>
        <div className={cn("interview-description mx-4", techStack.length > 0 ? "justify-between text-start" : "justify-center")}>
          <p className="text-sm">{description}</p>
          <DisplayTechIcons techStack={techStack}></DisplayTechIcons>
        </div>
      </Link>
    </div>
  )
}

export default InterviewCard