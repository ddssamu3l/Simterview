import React from 'react'
import dayjs from 'dayjs';
import Image from 'next/image'

const InterviewCard = ({id, name, length, difficulty, description, createdAt, questions, type, finalized, pass}: InterviewCardProps) => {
  const feedback = null as Feedback null;
  const formattedDate = dayjs(feedback?.createdAt || createdAt || Date.now()).format('MMM D, YYYY');
  return (
    <div className="card-border w-[360px] max-sm:w-full min-h-64">
      <div className="card-interview border-b">
        <div className="flex">
          {(pass !== undefined && pass !== null) && (
            pass ? (
              <Image src="/check.svg" alt="checkmark" width={15} height={15} className="mr-4"/>
            ) : (
                <Image src="/cross.svg" alt="crossmark" width={15} height={15} className="mr-4" />
            )
          )}

          
          <div className="flex justify-between w-full">
            <p className="badge-text">{difficulty}</p>
            <p className="badge-text">{type}</p>
          </div>
        </div>
      </div>
      <div className="interview-title">
        <h2>{name}</h2>
      </div>
    </div>
  )
}

export default InterviewCard