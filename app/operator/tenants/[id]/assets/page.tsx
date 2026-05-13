'use client';

import { useState, useEffect, use, useRef } from 'react';
import Link from 'next/link';

const CATEGORIES = ['venue', 'product', 'team', 'event', 'brand', 'other'] as const;
type Category = typeof CATEGORIES[number];

const CAT_COLORS: Record<Category, string> = {
  venue: 'bg-blue-100 text-blue-700',
  product: 'bg-green-100 text-green-700',
  team: 'bg-purple-100 text-purple-700',
  event: 'bg-orange-100 text-orange-700',
  brand: 'bg-pink-100 text-pink-700',
  other: 'bg-gray-100 text-gray-600',
};

export default function AssetStudioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filterCat, setFilterCat] = useState<Category | 'all'>('all');
  const [uploadCategory, setUploadCategory] = useState<Category>('other');
  const [uploadAltText, setUploadAltText] = useState('');
  const [uploadTags, setUploadTags] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<{ category: Category; alt_text: string; tags: string }>({ category: 'other', alt_text: '', tags: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => { fetchAssets(); }, []);

  async function fetchAssets() {
    const res = await fetch(`/api/assets?tenant_id=${id}`);
    if (res.ok) {
      const data = await res.json();
      setAssets(data.assets || []);
    }
    setLoading(false);
  }

  async function uploadFiles(files: FileList | File[]) {
    const fileArr = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (fileArr.length === 0) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('tenant_id', id);
      formData.append('category', uploadCategory);
      formData.append('alt_text', uploadAltText);
      formData.append('tags', uploadTags);
      fileArr.forEach(f => formData.append('files', f));
      const res = await fetch('/api/assets', { method: 'POST', body: formData });
      if (res.ok) {
        await fetchAssets();
        setUploadAltText('');
        setUploadTags('');
      }
    } finally {
      setUploading(false);
    }
  }

  async function deleteAsset(assetId: string) {
    if (!confirm('Delete this asset?')) return;
    await fetch(`/api/assets/${assetId}`, { method: 'DELETE' });
    setAssets(prev => prev.filter(a => a.id !== assetId));
  }

  async function saveEdit(assetId: string) {
    const tags = editFields.tags.split(',').map(t => t.trim()).filter(Boolean);
    const res = await fetch(`/api/assets/${assetId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: editFields.category, alt_text: editFields.alt_text, tags }),
    });
    if (res.ok) {
      const { asset } = await res.json();
      setAssets(prev => prev.map(a => a.id === assetId ? asset : a));
      setEditingId(null);
    }
  }

  function startEdit(asset: any) {
    setEditingId(asset.id);
    setEditFields({
      category: asset.category || 'other',
      alt_text: asset.alt_text || '',
      tags: (asset.tags || []).join(', '),
    });
  }

  const filtered = filterCat === 'all' ? assets : assets.filter(a => a.category === filterCat);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/operator/tenants/${id}`} className="text-gray-400 hover:text-gray-600">&larr;</Link>
        <h1 className="text-2xl font-bold">Asset Studio</h1>
        <span className="text-sm text-gray-400">{assets.length} assets</span>
      </div>

      {/* Upload zone */}
      <div
        className={`bg-white rounded-xl p-6 shadow-sm mb-6 border-2 border-dashed transition-colors ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); uploadFiles(e.dataTransfer.files); }}
      >
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <div className="flex-1">
            <p className="font-medium mb-1">Upload Photos</p>
            <p className="text-sm text-gray-400 mb-3">Drag & drop or click to select. JPG, PNG, WebP. Up to 20MB each.</p>
            <div className="flex flex-wrap gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Category</label>
                <select value={uploadCategory} onChange={e => setUploadCategory(e.target.value as Category)} className="px-3 py-1.5 border rounded-lg text-sm bg-white">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex-1 min-w-40">
                <label className="text-xs text-gray-500 block mb-1">Description (optional)</label>
                <input type="text" value={uploadAltText} onChange={e => setUploadAltText(e.target.value)} placeholder="e.g. Main dining area at night" className="w-full px-3 py-1.5 border rounded-lg text-sm" />
              </div>
              <div className="flex-1 min-w-40">
                <label className="text-xs text-gray-500 block mb-1">Tags (comma-separated)</label>
                <input type="text" value={uploadTags} onChange={e => setUploadTags(e.target.value)} placeholder="coffee, morning, cozy" className="w-full px-3 py-1.5 border rounded-lg text-sm" />
              </div>
            </div>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap mt-auto"
          >
            {uploading ? 'Uploading...' : 'Select Files'}
          </button>
        </div>
        <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={e => e.target.files && uploadFiles(e.target.files)} />
      </div>

      {/* Filter bar */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(['all', ...CATEGORIES] as const).map(cat => (
          <button key={cat} onClick={() => setFilterCat(cat as any)}
            className={`px-3 py-1 rounded-full text-sm capitalize transition-colors ${filterCat === cat ? 'bg-gray-800 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}>
            {cat} {cat !== 'all' && `(${assets.filter(a => a.category === cat).length})`}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <p className="text-gray-400 text-center py-12">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm text-center text-gray-400">
          {filterCat === 'all' ? 'No assets yet. Upload photos above.' : `No ${filterCat} photos yet.`}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filtered.map(asset => (
            <div key={asset.id} className="bg-white rounded-xl shadow-sm overflow-hidden group">
              <div className="relative aspect-square bg-gray-100">
                <img src={asset.url} alt={asset.alt_text || asset.original_name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button onClick={() => startEdit(asset)} className="px-3 py-1.5 bg-white text-gray-800 rounded-lg text-xs font-medium hover:bg-gray-100">Edit</button>
                  <button onClick={() => deleteAsset(asset.id)} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700">Delete</button>
                </div>
              </div>
              {editingId === asset.id ? (
                <div className="p-3 space-y-2">
                  <select value={editFields.category} onChange={e => setEditFields(f => ({ ...f, category: e.target.value as Category }))} className="w-full px-2 py-1 border rounded text-xs bg-white">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input value={editFields.alt_text} onChange={e => setEditFields(f => ({ ...f, alt_text: e.target.value }))} placeholder="Description" className="w-full px-2 py-1 border rounded text-xs" />
                  <input value={editFields.tags} onChange={e => setEditFields(f => ({ ...f, tags: e.target.value }))} placeholder="tag1, tag2" className="w-full px-2 py-1 border rounded text-xs" />
                  <div className="flex gap-1">
                    <button onClick={() => saveEdit(asset.id)} className="flex-1 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700">Save</button>
                    <button onClick={() => setEditingId(null)} className="flex-1 py-1 bg-gray-100 text-gray-600 rounded text-xs hover:bg-gray-200">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="p-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${CAT_COLORS[asset.category as Category] || CAT_COLORS.other}`}>{asset.category}</span>
                  {asset.alt_text && <p className="text-xs text-gray-500 mt-1 truncate">{asset.alt_text}</p>}
                  {asset.tags?.length > 0 && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{asset.tags.join(', ')}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
