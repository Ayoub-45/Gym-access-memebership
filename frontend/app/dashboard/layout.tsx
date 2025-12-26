'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userRaw = localStorage.getItem('user');

    // 1️⃣ Not logged in → login
    if (!token || !userRaw) {
      router.replace('/login');
      return;
    }

    const user = JSON.parse(userRaw);

    // 2️⃣ Staff → forbidden → verify ONLY
    if (user.role === 'staff') {
      router.replace('/verify');
      return;
    }

    // 3️⃣ Admin → allowed (do nothing)
  }, [router]);

  return <>{children}</>;
}
