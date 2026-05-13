'use client';

import { useState } from 'react';

interface Props {
  postId: string;
  imageUrl: string | null;
  visualDescription: string | null;
  onComplete: () => void;
}

export default function PostImageEditor({ postId, imageUrl, visualDescription, onComplete }: Props) {
  const [editing, setEditing] = useState(false);
  const [prompt, setPrompt] = useState(visualDescription || '');
  const [generating, setGenerating] = useState(false);

  async function regenerate() {
    setGenerating(true);
    try {
      const res = await fetch(`/api/content/${postId}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          component: 'image',
          visual_description: prompt.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert('Image generation failed: ' + (err.error || res.statusText));
        return;
      }
      setEditing(false);
      onComplete();
    } catch {
      alert('Network error.');
    } finally {
      setGenerating(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex flex-col items-end gap-1">
        {imageUrl ? (
          <a href={imageUrl} target="_blank" rel="noreferrer">
            <img src={imageUrl} alt="" className="w-16 h-16 rounded-lg object-cover hover:opacity-80" />
          </a>
        ) : (
          <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-xs text-center px-1">No image</div>
        )}
        <button
          onClick={() => { setPrompt(visualDescription || ''); setEditing(true); }}
          className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
        >
          {imageUrl ? 'Edit prompt' : 'Generate image'}
        </button>
      </div>
    );
  }

  return (
    <div className="w-72 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <p className="text-xs font-medium text-blue-800 mb-1.5">Image prompt for DALL-E</p>
      <textarea
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        rows={4}
        placeholder="Describe the scene: subject, composition, lighting, mood, style..."
        className="w-full px-2 py-1.5 border border-blue-200 rounded text-xs bg-white resize-none"
      />
      <div className="flex gap-2 mt-2">
        <button
          onClick={regenerate}
          disabled={generating}
          className="flex-1 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {generating ? 'Generating...' : imageUrl ? 'Regenerate' : 'Generate'}
        </button>
        <button
          onClick={() => setEditing(false)}
          className="px-3 py-1.5 border border-gray-300 rounded text-xs hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
