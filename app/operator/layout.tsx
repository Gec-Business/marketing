import Sidebar from '@/components/operator/Sidebar';
import TopBar from '@/components/operator/TopBar';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function OperatorLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'operator' && user.role !== 'admin')) redirect('/');

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <TopBar userName={user.name} />
        <main className="flex-1 p-6 bg-gray-50">{children}</main>
      </div>
    </div>
  );
}
