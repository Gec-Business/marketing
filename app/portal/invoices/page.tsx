'use client';

import { useState, useEffect } from 'react';

export default function PortalInvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchInvoices(); }, []);

  async function fetchInvoices() {
    try {
      const res = await fetch('/api/invoices');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setInvoices(data.invoices || []);
    } catch (e) {
      console.error('Fetch invoices error:', e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <p className="text-gray-400 text-center py-8">Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Invoices</h1>

      {invoices.length === 0 ? (
        <p className="text-gray-400 text-center py-12">No invoices yet.</p>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv: any) => (
            <div key={inv.id} className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{inv.invoice_number}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    inv.status === 'paid' ? 'bg-green-100 text-green-700' :
                    inv.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                    inv.status === 'overdue' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {inv.status}
                  </span>
                </div>
                <p className="text-sm text-gray-400 mt-1">{inv.period_start} - {inv.period_end}</p>
                {inv.due_date && <p className="text-xs text-gray-400">Due: {inv.due_date}</p>}
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold">{inv.currency} {Number(inv.total_amount).toFixed(2)}</span>
                <a href={`/api/invoices/${inv.id}/pdf`} className="text-xs px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Download PDF
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
