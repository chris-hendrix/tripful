'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/app/providers/auth-provider';

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const { user, loading, refetch } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // If we're not loading and don't have a user, refetch to check auth cookie
    // This handles the race condition when navigating immediately after login/profile completion
    if (!loading && !user) {
      refetch();
    }
  }, [pathname, loading, user, refetch]);

  useEffect(() => {
    // Give refetch a chance to complete before redirecting
    const timer = setTimeout(() => {
      if (!loading && !user) {
        router.push('/login');
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600 animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
