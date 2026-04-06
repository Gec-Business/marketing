'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const nav = [
  { href: '/operator', label: 'Overview', icon: '◇' },
  { href: '/operator/tenants', label: 'Tenants', icon: '◈' },
  { href: '/operator/invoices', label: 'Invoices', icon: '◆' },
  { href: '/operator/settings', label: 'Settings', icon: '◉' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 bg-gray-900 text-white min-h-screen flex flex-col">
      <div className="p-5 border-b border-gray-700">
        <h2 className="text-lg font-bold">MK Platform</h2>
        <p className="text-xs text-gray-400">Operations</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {nav.map((item) => {
          const active = pathname === item.href || (item.href !== '/operator' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${active ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
