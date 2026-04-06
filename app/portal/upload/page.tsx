'use client';

import { useState, useEffect } from 'react';

export default function UploadPage() {
  const [files, setFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.user?.tenant_id) setTenantId(d.user.tenant_id);
    });
  }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList || !tenantId) return;

    setUploading(true);
    for (const file of Array.from(fileList)) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tenant_id', tenantId);
      const res = await fetch('/api/content/upload', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        setFiles(prev => [data.media, ...prev]);
      }
    }
    setUploading(false);
    e.target.value = '';
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Upload Media</h1>
      <div className="bg-white rounded-xl p-8 shadow-sm text-center mb-6">
        <label className="cursor-pointer">
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 hover:border-blue-400 transition">
            <p className="text-gray-500 mb-2">{uploading ? 'Uploading...' : 'Click or drag files here'}</p>
            <p className="text-xs text-gray-400">Videos, images, documents — up to 500MB</p>
          </div>
          <input type="file" multiple onChange={handleUpload} className="hidden" disabled={uploading} />
        </label>
      </div>

      {files.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Uploaded Files</h2>
          <div className="space-y-2">
            {files.map((f: any) => (
              <div key={f.id} className="bg-white rounded-lg p-3 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{f.original_name}</p>
                  <p className="text-xs text-gray-400">{f.mime_type} — {(f.size_bytes / 1024 / 1024).toFixed(1)} MB</p>
                </div>
                <a href={f.file_path} target="_blank" className="text-xs text-blue-600 hover:underline">View</a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
