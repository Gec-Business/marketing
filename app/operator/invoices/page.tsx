'use client';

import { useState, useEffect } from 'react';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchInvoices(); }, []);

  async function fetchInvoices() {
    try {
      const res = await fetch('/api/invoices');
      if (!res.ok) throw new Error('Failed to fetch invoices');
      const data = await res.json();
      setInvoices(data.invoices || []);
    } catch (e) {
      console.error('Fetch invoices error:', e);
    } finally {
      setLoading(false);
    }
  }

  async function markPaid(id: string) {
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid', paid_at: new Date().toISOString() }),
      });
      if (!res.ok) { alert('Failed to mark invoice as paid'); return; }
      fetchInvoices();
    } catch (e) {
      alert('Network error. Please try again.');
    }
  }

  if (loading) return <p className="text-gray-400 text-center py-8">Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">All Invoices</h1>
      {invoices.length === 0 ? (
        <p className="text-gray-400 text-center py-12">No invoices yet.</p>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv: any) => (
            <div key={inv.id} className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{inv.invoice_number}</span>
                  <span className="text-sm text-gray-500">{inv.tenant_name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${inv.status === 'paid' ? 'bg-green-100 text-green-700' : inv.status === 'sent' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                    {inv.status}
                  </span>
                </div>
                <p className="text-sm text-gray-400">{inv.period_start} - {inv.period_end}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold">{inv.currency} {Number(inv.total_amount).toFixed(2)}</span>
                {inv.status !== 'paid' && (
                  <button onClick={() => markPaid(inv.id)} className="text-xs px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700">
                    Mark Paid
                  </button>
                )}
                <a href={`/api/invoices/${inv.id}/pdf`} className="text-xs text-blue-600 hover:underline">PDF</a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
