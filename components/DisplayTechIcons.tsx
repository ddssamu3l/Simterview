import { getTechLogos } from '@/lib/utils'
import React from 'react'
import Image from 'next/image'

const DisplayTechIcons = async ({techStack}: TechIconProps) => {
  const techIcons = await getTechLogos(techStack);
  return (
    <div className="flex flex-row">
      {techIcons.slice(0,3).map(({tech, url}, index) => (
        <div key={index} className="relative group rounded-full p-1 flex-center">
          <span className="tech-tooltip">{tech}</span>
          <Image src={url} alt={tech} width={100} height={100} className="size-5"/>
        </div>
      ))}
    </div>
  )
}

export default DisplayTechIcons