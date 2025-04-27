"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

import FeedbackList from "@/components/FeedbackList";
import UserProfile from "@/components/UserProfile";
import { getCurrentUser } from "@/lib/actions/auth.action";

export default function Page() {
  const params = useParams<{ id: string }>();
  const userId = params.id;

  const router = useRouter();
  const [user, setUser] = useState<User>();

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        router.push("/sign-in");
      } else {
        setUser(currentUser);
      }
    };

    fetchUser();
  }, [router]);

  if (!user) return <p>Loading...</p>;

  return (
    <section className="container mx-auto px-4 py-8">
      <UserProfile {...user} />
      <FeedbackList userId={userId} />
    </section>
  );
}
