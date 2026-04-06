'use client';

import { useRouter } from 'next/navigation';

export default function TopBar({ userName }: { userName: string }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  }

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div />
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">{userName}</span>
        <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-red-500">
          Log out
        </button>
      </div>
    </header>
  );
}
