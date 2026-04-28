'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';

const PLATFORMS = [
  { id: 'facebook', label: 'Facebook + Instagram', color: '#1877F2', desc: 'Connects both Facebook Page and Instagram Business', connectsAlso: 'instagram' },
  { id: 'linkedin', label: 'LinkedIn', color: '#0A66C2', desc: 'Company page posting', connectsAlso: null },
  { id: 'tiktok', label: 'TikTok', color: '#000000', desc: 'Video and photo posting', connectsAlso: null },
];

export default function ConnectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [connections, setConnections] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchConnections(); }, []);

  async function fetchConnections() {
    try {
      const res = await fetch(`/api/tenants/${id}/connections`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      const connMap: Record<string, any> = {};
      for (const conn of data.connections || []) {
        connMap[conn.platform] = conn;
      }
      setConnections(connMap);
    } catch (e) {
      console.error('Fetch connections error:', e);
    } finally {
      setLoading(false);
    }
  }

  function connectPlatform(platform: string) {
    const url = platform === 'facebook'
      ? `/api/connect/facebook?tenant_id=${id}`
      : platform === 'linkedin'
      ? `/api/connect/linkedin?tenant_id=${id}`
      : `/api/connect/tiktok?tenant_id=${id}`;

    const popup = window.open(url, '_blank', 'width=600,height=700');

    // Refresh connections when popup closes
    const timer = setInterval(() => {
      if (popup?.closed) {
        clearInterval(timer);
        fetchConnections();
      }
    }, 1000);
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/operator/tenants/${id}`} className="text-gray-400 hover:text-gray-600">&larr;</Link>
        <h1 className="text-2xl font-bold">Connect Social Accounts</h1>
      </div>

      <div className="space-y-4">
        {PLATFORMS.map((p) => {
          const conn = connections[p.id];
          const isConnected = conn?.status === 'active';
          const isExpired = conn?.expires_at && new Date(conn.expires_at) < new Date();

          return (
            <div key={p.id} className="bg-white rounded-xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold" style={{ color: p.color }}>{p.label}</h3>
                  {isConnected && !isExpired && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Connected</span>
                  )}
                  {isExpired && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">Expired</span>
                  )}
                  {!conn && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Not connected</span>
                  )}
                </div>
                <p className="text-sm text-gray-500">{p.desc}</p>
                {conn?.page_name && (
                  <p className="text-xs text-blue-600 mt-1">📄 {conn.page_name}</p>
                )}
                {conn?.connected_at && (
                  <p className="text-xs text-gray-400 mt-1">Connected: {new Date(conn.connected_at).toLocaleDateString()}</p>
                )}
              </div>
              <button
                onClick={() => connectPlatform(p.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  isConnected && !isExpired
                    ? 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isConnected && !isExpired ? 'Reconnect' : 'Connect'}
              </button>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-400 mt-6">
        After clicking Connect, log in with the client&apos;s account and grant permissions. The window will close automatically.
      </p>
    </div>
  );
}
