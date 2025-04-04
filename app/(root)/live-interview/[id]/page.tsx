import Agent from '@/components/Agent'
import { getCurrentUser } from '@/lib/actions/auth.action'
import React from 'react'

type PageProps = {
  params: {
    id: string;
  }
}

const Page = async ({ params }: PageProps) => {
  const { id } = await params;
  const user = await getCurrentUser();

  return (
    <div>
      <Agent username={user?.name || "You"} userId={user?.id} interviewId={id}/>
    </div>
  );
}

export default Page;
