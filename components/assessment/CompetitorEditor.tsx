'use client';

import { useState } from 'react';

interface Competitor {
  name: string;
  type: string;
  price_positioning: string;
  estimated_branches?: number;
  strengths: string[];
  weaknesses: string[];
  geographic_overlap: string;
  added_manually?: boolean;
}

interface Props {
  assessmentId: string;
  competitors: Competitor[];
  onUpdate: () => void;
}

export default function CompetitorEditor({ assessmentId, competitors: initial, onUpdate }: Props) {
  const [competitors, setCompetitors] = useState<Competitor[]>(initial);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('single');
  const [newPosition, setNewPosition] = useState('mid');
  const [newStrengths, setNewStrengths] = useState('');
  const [newWeaknesses, setNewWeaknesses] = useState('');
  const [newOverlap, setNewOverlap] = useState('medium');

  async function saveAll(updated: Competitor[]) {
    setSaving(true);
    try {
      const res = await fetch(`/api/assessments/${assessmentId}/competitors`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitors: updated }),
      });
      if (!res.ok) { alert('Failed to save'); return; }
      setCompetitors(updated);
      onUpdate();
    } catch (e) {
      alert('Network error.');
    } finally {
      setSaving(false);
    }
  }

  function removeCompetitor(index: number) {
    if (!confirm(`Remove "${competitors[index].name}" from competitors?`)) return;
    const updated = competitors.filter((_, i) => i !== index);
    saveAll(updated);
  }

  function addCompetitor() {
    if (!newName.trim()) { alert('Name is required'); return; }
    const competitor: Competitor = {
      name: newName.trim(),
      type: newType,
      price_positioning: newPosition,
      strengths: newStrengths.split(',').map(s => s.trim()).filter(Boolean),
      weaknesses: newWeaknesses.split(',').map(s => s.trim()).filter(Boolean),
      geographic_overlap: newOverlap,
      added_manually: true,
    };
    const updated = [...competitors, competitor];
    saveAll(updated);
    setShowAdd(false);
    setNewName('');
    setNewStrengths('');
    setNewWeaknesses('');
  }

  function updateCompetitor(index: number, field: string, value: any) {
    const updated = [...competitors];
    (updated[index] as any)[field] = value;
    setCompetitors(updated);
  }

  function saveEdit(index: number) {
    setEditing(null);
    saveAll(competitors);
  }

  return (
    <div className="mt-4 space-y-3">
      {/* Edit/Remove buttons per competitor */}
      {competitors.map((c, i) => (
        <div key={i} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
          {editing === i ? (
            <div className="space-y-2">
              <input value={c.name} onChange={(e) => updateCompetitor(i, 'name', e.target.value)} className="w-full px-2 py-1 border rounded text-sm" placeholder="Name" />
              <div className="grid grid-cols-3 gap-2">
                <select value={c.type} onChange={(e) => updateCompetitor(i, 'type', e.target.value)} className="px-2 py-1 border rounded text-xs bg-white">
                  <option value="chain">Chain</option>
                  <option value="single">Single</option>
                  <option value="franchise">Franchise</option>
                  <option value="premium">Premium</option>
                  <option value="budget">Budget</option>
                </select>
                <select value={c.price_positioning} onChange={(e) => updateCompetitor(i, 'price_positioning', e.target.value)} className="px-2 py-1 border rounded text-xs bg-white">
                  <option value="budget">Budget</option>
                  <option value="mid">Mid</option>
                  <option value="premium">Premium</option>
                </select>
                <select value={c.geographic_overlap} onChange={(e) => updateCompetitor(i, 'geographic_overlap', e.target.value)} className="px-2 py-1 border rounded text-xs bg-white">
                  <option value="high">High overlap</option>
                  <option value="medium">Medium overlap</option>
                  <option value="low">Low overlap</option>
                </select>
              </div>
              <input value={(c.strengths || []).join(', ')} onChange={(e) => updateCompetitor(i, 'strengths', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} className="w-full px-2 py-1 border rounded text-xs" placeholder="Strengths (comma-separated)" />
              <input value={(c.weaknesses || []).join(', ')} onChange={(e) => updateCompetitor(i, 'weaknesses', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} className="w-full px-2 py-1 border rounded text-xs" placeholder="Weaknesses (comma-separated)" />
              <div className="flex gap-2">
                <button onClick={() => saveEdit(i)} disabled={saving} className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button onClick={() => { setEditing(null); setCompetitors(initial); }} className="px-3 py-1 border border-gray-300 rounded text-xs hover:bg-gray-50">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">{c.name}</span>
                {c.added_manually && <span className="text-xs text-blue-500 ml-2">(manual)</span>}
                <span className="text-xs text-gray-400 ml-2">{c.type} | {c.price_positioning} | {c.geographic_overlap} overlap</span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setEditing(i)} className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded">Edit</button>
                <button onClick={() => removeCompetitor(i)} className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded">Remove</button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add new competitor */}
      {showAdd ? (
        <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 bg-blue-50">
          <p className="text-sm font-medium text-blue-800 mb-2">Add Competitor</p>
          <div className="space-y-2">
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Competitor name" className="w-full px-3 py-2 border rounded-lg text-sm" />
            <div className="grid grid-cols-3 gap-2">
              <select value={newType} onChange={(e) => setNewType(e.target.value)} className="px-2 py-1.5 border rounded-lg text-xs bg-white">
                <option value="chain">Chain</option>
                <option value="single">Single</option>
                <option value="franchise">Franchise</option>
                <option value="premium">Premium</option>
                <option value="budget">Budget</option>
              </select>
              <select value={newPosition} onChange={(e) => setNewPosition(e.target.value)} className="px-2 py-1.5 border rounded-lg text-xs bg-white">
                <option value="budget">Budget</option>
                <option value="mid">Mid</option>
                <option value="premium">Premium</option>
              </select>
              <select value={newOverlap} onChange={(e) => setNewOverlap(e.target.value)} className="px-2 py-1.5 border rounded-lg text-xs bg-white">
                <option value="high">High overlap</option>
                <option value="medium">Medium overlap</option>
                <option value="low">Low overlap</option>
              </select>
            </div>
            <input value={newStrengths} onChange={(e) => setNewStrengths(e.target.value)} placeholder="Strengths (comma-separated)" className="w-full px-3 py-2 border rounded-lg text-xs" />
            <input value={newWeaknesses} onChange={(e) => setNewWeaknesses(e.target.value)} placeholder="Weaknesses (comma-separated)" className="w-full px-3 py-2 border rounded-lg text-xs" />
            <div className="flex gap-2">
              <button onClick={addCompetitor} disabled={saving} className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Adding...' : 'Add Competitor'}
              </button>
              <button onClick={() => setShowAdd(false)} className="px-4 py-1.5 border border-gray-300 rounded-lg text-xs hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowAdd(true)} className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition">
          + Add Competitor Manually
        </button>
      )}
    </div>
  );
}
