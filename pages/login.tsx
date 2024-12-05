// pages/login.tsx or app/login/page.tsx
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../contexts/auth-context';
import { useEffect } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuth();
  
  useEffect(() => {
    if (!isLoading && user) {
      const redirectTo = searchParams.get('redirectTo') || '/';
      router.replace(redirectTo);
    }
  }, [user, isLoading, router, searchParams]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <div>
        login
      </div>
    </>
  );
}