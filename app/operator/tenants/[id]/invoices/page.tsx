'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';

export default function TenantInvoicesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [items, setItems] = useState([{ description: '', amount: '' }]);
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => { fetchInvoices(); }, []);

  async function fetchInvoices() {
    try {
      const res = await fetch(`/api/invoices?tenant_id=${id}`);
      if (!res.ok) throw new Error('Failed to fetch invoices');
      const data = await res.json();
      setInvoices(data.invoices || []);
    } catch (e) {
      console.error('Fetch invoices error:', e);
    } finally {
      setLoading(false);
    }
  }

  async function generateMonthlyNow() {
    if (!confirm('Generate this month\'s subscription invoice for this tenant?')) return;
    try {
      const res = await fetch('/api/invoices/generate-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: id }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert('Failed: ' + (data.error || res.statusText));
        return;
      }
      alert(`Invoice ${data.invoice?.invoice_number} created.`);
      fetchInvoices();
    } catch (e) {
      alert('Network error.');
    }
  }

  async function createInvoice() {
    const validItems = items.filter(i => i.description && i.amount);
    if (!periodStart || !periodEnd || validItems.length === 0) {
      alert('Please fill in period dates and at least one line item.');
      return;
    }
    const total = validItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: id,
          items: validItems.map(i => ({ description: i.description, amount: parseFloat(i.amount) })),
          total_amount: total,
          period_start: periodStart,
          period_end: periodEnd,
          due_date: dueDate || null,
          notes: notes || null,
        }),
      });
      if (!res.ok) { alert('Failed to create invoice'); return; }
      setShowForm(false);
      setItems([{ description: '', amount: '' }]);
      fetchInvoices();
    } catch (e) {
      alert('Network error. Please try again.');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href={`/operator/tenants/${id}`} className="text-gray-400 hover:text-gray-600">&larr;</Link>
          <h1 className="text-2xl font-bold">Invoices</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={generateMonthlyNow} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
            Generate Monthly Now
          </button>
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            + New Invoice
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl p-5 shadow-sm mb-6">
          <h3 className="font-semibold mb-3">Create Invoice</h3>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <label className="text-xs text-gray-500">Period Start</label>
              <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Period End</label>
              <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Due Date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
          </div>
          <div className="space-y-2 mb-4">
            {items.map((item, i) => (
              <div key={i} className="flex gap-2">
                <input type="text" value={item.description} onChange={(e) => { const n = [...items]; n[i].description = e.target.value; setItems(n); }} placeholder="Description" className="flex-1 px-3 py-2 border rounded-lg text-sm" />
                <input type="number" value={item.amount} onChange={(e) => { const n = [...items]; n[i].amount = e.target.value; setItems(n); }} placeholder="Amount" className="w-32 px-3 py-2 border rounded-lg text-sm" />
              </div>
            ))}
            <button onClick={() => setItems([...items, { description: '', amount: '' }])} className="text-xs text-blue-600 hover:underline">+ Add item</button>
          </div>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" rows={2} className="w-full px-3 py-2 border rounded-lg text-sm mb-3" />
          <div className="flex justify-between items-center">
            <span className="font-semibold">Total: GEL {items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0).toFixed(2)}</span>
            <button onClick={createInvoice} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">Create Invoice</button>
          </div>
        </div>
      )}

      {invoices.map((inv: any) => (
        <div key={inv.id} className="bg-white rounded-xl p-4 shadow-sm mb-3 flex items-center justify-between">
          <div>
            <span className="font-semibold">{inv.invoice_number}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ml-2 ${inv.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{inv.status}</span>
            <p className="text-sm text-gray-400">{inv.period_start} - {inv.period_end}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-semibold">{inv.currency} {Number(inv.total_amount).toFixed(2)}</span>
            <a href={`/api/invoices/${inv.id}/pdf`} className="text-xs text-blue-600 hover:underline">PDF</a>
          </div>
        </div>
      ))}
    </div>
  );
}
