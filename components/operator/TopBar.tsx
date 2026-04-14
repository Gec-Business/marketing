'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function TopBar({ userName }: { userName: string }) {
  const router = useRouter();
  const [alertCount, setAlertCount] = useState(0);
  const [maxSeverity, setMaxSeverity] = useState<string>('info');

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, []);

  async function fetchCount() {
    try {
      const res = await fetch('/api/system/alerts');
      if (!res.ok) return;
      const data = await res.json();
      const c = data.counts || {};
      const total = (c.critical || 0) + (c.error || 0) + (c.warning || 0);
      setAlertCount(total);
      if (c.critical > 0) setMaxSeverity('critical');
      else if (c.error > 0) setMaxSeverity('error');
      else if (c.warning > 0) setMaxSeverity('warning');
      else setMaxSeverity('info');
    } catch {}
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  }

  const badgeColor = maxSeverity === 'critical' ? 'bg-red-500' : maxSeverity === 'error' ? 'bg-orange-500' : 'bg-yellow-500';

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div />
      <div className="flex items-center gap-4">
        {alertCount > 0 && (
          <Link href="/operator" className="relative">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${badgeColor} text-white text-xs font-medium rounded-full hover:opacity-90`}>
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              {alertCount} alert{alertCount === 1 ? '' : 's'}
            </span>
          </Link>
        )}
        <span className="text-sm text-gray-600">{userName}</span>
        <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-red-500">
          Log out
        </button>
      </div>
    </header>
  );
}
