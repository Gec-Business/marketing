'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';

const PLATFORMS = [
  { id: 'facebook', label: 'Facebook + Instagram', color: '#1877F2', desc: 'Connects both Facebook Page and Instagram Business' },
  { id: 'linkedin', label: 'LinkedIn', color: '#0A66C2', desc: 'Company page posting' },
  { id: 'tiktok', label: 'TikTok', color: '#000000', desc: 'Video and photo posting' },
];

export default function ConnectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchConnections(); }, []);

  async function fetchConnections() {
    const res = await fetch(`/api/tenants/${id}`);
    const data = await res.json();
    // For now, just check social_connections
    setLoading(false);
  }

  function connectPlatform(platform: string) {
    const url = platform === 'facebook'
      ? `/api/connect/facebook?tenant_id=${id}`
      : platform === 'linkedin'
      ? `/api/connect/linkedin?tenant_id=${id}`
      : `/api/connect/tiktok?tenant_id=${id}`;
    window.open(url, '_blank', 'width=600,height=700');
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/operator/tenants/${id}`} className="text-gray-400 hover:text-gray-600">&larr;</Link>
        <h1 className="text-2xl font-bold">Connect Social Accounts</h1>
      </div>

      <div className="space-y-4">
        {PLATFORMS.map((p) => (
          <div key={p.id} className="bg-white rounded-xl p-5 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="font-semibold" style={{ color: p.color }}>{p.label}</h3>
              <p className="text-sm text-gray-500">{p.desc}</p>
            </div>
            <button
              onClick={() => connectPlatform(p.id)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Connect
            </button>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400 mt-6">
        After clicking Connect, log in with the client&apos;s account and grant permissions. The window will close automatically.
      </p>
    </div>
  );
}
