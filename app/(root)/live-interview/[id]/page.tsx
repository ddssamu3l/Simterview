import { getCurrentUser } from '@/lib/actions/auth.action';
import React from 'react';
import ClientLiveInterview from './client';

type PageProps = {
  params: {
    id: string;
  }
}

const Page = async ({ params }: PageProps) => {
  const { id } = await params;
  const user = await getCurrentUser();

  return <ClientLiveInterview id={id} username={user?.name || "You"} userId={user?.id} />;
};

export default Page;
