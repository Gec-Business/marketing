'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const nav = [
  { href: '/portal', label: 'Content' },
  { href: '/portal/upload', label: 'Upload' },
  { href: '/portal/strategy', label: 'Strategy' },
  { href: '/portal/invoices', label: 'Invoices' },
];

export default function PortalNav({ tenantName }: { tenantName: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6">
      <div className="flex items-center justify-between h-14">
        <div className="flex items-center gap-6">
          <h1 className="font-bold text-lg">{tenantName}</h1>
          <nav className="flex gap-1">
            {nav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 text-sm rounded-lg ${active ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-red-500">
          Log out
        </button>
      </div>
    </header>
  );
}
