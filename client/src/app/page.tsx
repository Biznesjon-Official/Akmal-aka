'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (!loading && user) {
      // Asosiy sahifa sifatida Kassa sahifasiga yo'naltirish
      router.push('/cash');
    }
  }, [user, loading, router]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return <LoadingSpinner />;
}