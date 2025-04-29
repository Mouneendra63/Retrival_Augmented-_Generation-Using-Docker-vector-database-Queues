'use client';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Page() {
  const { user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push('/home'); // Redirect to /home if user is logged in
    }
  }, [user, router]);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-3xl font-bold">Welcome</h1>
      <p className="text-gray-600 mt-2">Please sign in or sign up to continue.</p>
    </main>
  );
}