'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { motion } from 'framer-motion';

export default function TopNav() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  const goDashboard = () => {
    if (!user) {
      // If not logged in, simple redirect to home where login is triggered on CTA
      router.push('/');
      return;
    }
    // For demo, check a stored hint on role route choice
    const storedRole = typeof window !== 'undefined' ? window.localStorage.getItem('beam-confirmed-role') : null;
    router.push(storedRole === 'community' ? '/community-dashboard' : '/participant-dashboard');
  };

  return (
    <nav className="fixed top-0 inset-x-0 z-40 bg-transparent text-[#77859D]">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between text-sm">
        <Link href="/" className="font-semibold text-[#77859D]">BEAM</Link>
        <div className="flex items-center gap-3">
          <Link href="/" className="rounded-md px-3 py-1 hover:bg-white/5/0 text-[#77859D]">Home</Link>
          <button onClick={goDashboard} className="rounded-md px-3 py-1 hover:bg-white/5/0 text-[#77859D]">Dashboard</button>
          {user ? (
            <button onClick={logout} className="rounded-md px-3 py-1 hover:bg-white/5/0 text-[#77859D]">Logout</button>
          ) : null}
        </div>
      </div>
    </nav>
  );
}


